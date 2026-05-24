# Vineyard Journal — Photo Attachments on Log Entries

**Status:** Design approved 2026-05-24
**Scope:** Add photo capture, upload, display, and editing to Observation, Milestone, and Spray log entries in `vineyard-journal.html`.

---

## Goals

- Capture multiple photos per entry directly from the vineyard (PWA, mobile-first).
- Display photos inline in the journal feed so the user can scan entries visually.
- Allow full editing (including photo add/remove) of existing entries.
- Reuse the existing Airtable proxy pattern; introduce no new storage infrastructure.

## Non-Goals (YAGNI)

- Captions per photo.
- Photo reordering after selection.
- Offline upload queue — save fails with a toast if offline.
- "Has photo" filter chip in the feed.
- Bulk download / export from the app.
- Camera-only mode (the OS picker is fine).
- Photos on Weather entries (auto-logged; not editable).

---

## Architecture

### Storage

Airtable's **Upload Attachment** endpoint (`POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment`) accepts a base64 payload up to 5 MB. Photos are resized client-side to fit comfortably under that cap. No third-party storage is used.

### Components

| Component | Location | Responsibility |
|---|---|---|
| Schema change | Airtable `TBL_VL` | New `Photos` attachment field |
| Resize helper | `vineyard-journal.html` `<script>` | Resize / re-encode any selected file to JPEG, ≤1920px longest side |
| Proxy extension | `api/airtable.js` | New `action: 'uploadAttachment'` branch that forwards to Airtable's content API |
| Capture UI | `vineyard-journal.html` left-panel forms | "Add Photo" button + horizontal thumb strip on each of three forms |
| Feed display | `vineyard-journal.html` `entryHTML()` | Hero thumb + `+N more` badge per entry that has photos |
| Lightbox | `vineyard-journal.html` | Full-screen photo viewer with prev/next + keyboard nav |
| Edit slide-over | `vineyard-journal.html` | Right-edge dark panel for editing existing entries, including photos |
| Service worker | `sw.js` | Cache version bump on deploy |

Each component has a single responsibility and a clear interface to its neighbors. The resize helper takes a `File`, returns a `Blob`. The upload helper takes a record ID, field ID, and resized blob, returns the updated record. The UI layers depend on these helpers but not on each other.

---

## Detailed Design

### 1. Airtable schema change

Add one field to `TBL_VL` (`tblhJhDKNMxUCncnn`):

| Constant | Field name | Type |
|---|---|---|
| `F_VL_PHOTOS` | `Photos` | `multipleAttachments` |

The field is added via the Airtable UI. The resulting field ID is wired into the field-ID constants block at the top of `vineyard-journal.html` and documented in `CLAUDE.md`.

### 2. Capture UX (new and edit)

On each of the three relevant forms — **Observation**, **Milestone**, **Spray** — a new "📷 Add Photo" button appears under the Notes field. It triggers a hidden `<input type="file" accept="image/*" multiple>`.

After selection:

1. Each chosen file runs through the resize pipeline (section 3).
2. The result renders as a 64px square thumb in a horizontal "Photos" strip directly below the Add Photo button.
3. Each thumb has a small ✕ in the top-right corner to remove it from the queue before saving.
4. Files stay in memory as resized `Blob`s, with object URLs for preview, until Save fires.

States:
- **Empty:** strip is hidden.
- **One or more thumbs:** strip is visible, scrolls horizontally on overflow.
- **Resizing in progress:** thumb shows a small spinner until its blob is ready.

Object URLs are revoked when the thumb is removed or the form is submitted, to avoid memory leaks.

### 3. Resize pipeline

Helper: `resizeImage(file: File): Promise<Blob>` — a small vanilla-JS function in the existing `<script>` block.

Parameters:
- **Longest side:** 1920 px
- **Format:** JPEG
- **Quality:** 0.85
- **EXIF orientation:** normalized — the canvas re-encoding pass bakes correct orientation into the output regardless of source EXIF

Implementation uses `createImageBitmap()` with `imageOrientation: 'from-image'` and an off-screen `<canvas>`. Output blob has `type: 'image/jpeg'`.

Even images already under 1 MB are re-encoded so orientation is baked in; without this, Airtable's web UI displays sideways photos from some Android devices.

Errors:
- Non-image file: rejected before resize, toast "Photos only".
- File > 25 MB (raw): rejected before resize as a memory guard, toast "File too large — try a smaller photo".
- Resize fails for any other reason: toast "Couldn't process photo," that photo is dropped from the queue, other photos continue.

### 4. Proxy extension + upload flow

`api/airtable.js` gets one new branch inside the existing `POST` handler, detected by `req.body.action === 'uploadAttachment'`:

```
POST /api/airtable
{
  action:      'uploadAttachment',
  baseId:      '<base>',
  recordId:    '<rec>',
  fieldId:     '<fld>',
  contentType: 'image/jpeg',
  filename:    'photo-<timestamp>.jpg',
  file:        '<base64 string>'
}
```

The proxy forwards to:
```
POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment
Body: { contentType, file, filename }
```

The proxy returns Airtable's response payload (which includes the updated record with all attachments in the cell). The existing `POST` create branch is untouched.

**Save flow on a new entry** (applies to Observation, Milestone, Spray):

1. Submit handler reads the text fields and posts to `TBL_VL` via the existing create flow → returns `recordId`.
2. For each resized blob in the photo queue: base64-encode and call the proxy with `action: 'uploadAttachment'`.
3. Uploads run **sequentially**, not in parallel — parallel uploads to the same attachment cell can race and drop on Airtable's side.
4. The Save button shows "Uploading 1 / 3…" progress while uploads run.
5. On any single upload failure: toast the error, keep the record (text fields saved fine), leave failed photos in the queue with a "Retry" chip.
6. On full success: clear the queue, revoke object URLs, toast "Observation saved with 3 photos" (count adjusted to actual).
7. Local `logEntries` cache is updated from the final Airtable response so the new entry renders with its hero thumb immediately.

### 5. Feed display

In `entryHTML()`, when an entry has `photos.length > 0`, append a photo block after the text body:

- **Hero thumb:** 120 × 120 px, `object-fit: cover`, 4 px rounded corners. Sources `thumbnails.large.url`, falling back to `url` if Airtable hasn't generated thumbnails yet (typically ready within 5–30 s of upload).
- **More-photos badge:** if `photos.length > 1`, a small pill in the bottom-right corner of the hero shows `+N more` (additional count, not total).
- Click / tap the hero opens the lightbox (section 6).

The `photos` array on each entry mirrors Airtable's `multipleAttachments` shape: `[{ id, url, filename, thumbnails: { small, large, full } }, ...]`.

Existing filter chips (`All / Weather / Spray / Obs`) are unchanged.

### 6. Lightbox

Full-screen photo viewer, implemented as a fixed-position overlay appended to `<body>`:

- **Background:** `--dark` (#1e1710) at 95% opacity.
- **Image:** centered, `max-width: 100vw; max-height: 100vh; object-fit: contain`.
- **Counter:** `2 / 4` at top-center.
- **Close:** ✕ button top-right; also Esc key; also tap on backdrop.
- **Navigation:** left/right chevron buttons on desktop; touch-swipe horizontally on mobile.
- **Photo source:** `thumbnails.full.url`, falling back to `url`.
- **Loading state:** centered spinner until the `<img>`'s `onload` fires.
- **Keyboard:** ← / → cycle, Esc closes.

About 80 lines of vanilla JS + CSS; no library.

### 7. Edit slide-over

Tapping anywhere on an entry card (except the ✕ delete button) opens a **dark slide-over panel** from the right edge.

Layout:

- **Width:** 420 px on desktop, 100 vw on mobile.
- **Animation:** slides in from right (200 ms ease-out); backdrop fades to 40 % black over the rest of the screen.
- **Dismiss:** Cancel button, tap backdrop, or Esc — confirms before closing if there are unsaved changes.

Form fields per entry type:

| Entry type | Editable fields |
|---|---|
| Observation | Date, Category, Notes, Photos |
| Milestone | Date, Notes, Photos (milestone name is fixed) |
| Spray | Date, Product, Rate, Method, Target, Blocks, Notes, Photos |
| Weather | Not editable — click is a no-op (weather is auto-logged and won't have photos) |

Photo management in the edit panel:

- Existing photos appear as 64 px thumbs in the strip; each has a ✕ in the corner.
- Tapping ✕ marks the photo for removal locally — it doesn't delete from Airtable until Save.
- "Add Photo" button below the strip queues additional photos through the same resize pipeline.

Save flow:

1. Diff old vs. new field values; build PATCH payload with only changed fields.
2. PATCH the record via the existing proxy `PATCH` branch.
3. For newly queued photos: upload each via `uploadAttachment` (sequential).
4. For removed photos: PATCH the Photos field with only the surviving attachment objects — Airtable removes any not included in that array.
5. Update local `logEntries` and re-render feed.
6. Toast "Entry updated".

If text-field PATCH succeeds but a photo upload fails, the text changes are kept and the failed photo stays queued with a Retry chip (same pattern as the create flow).

### 8. Service worker

Bump `CACHE` in `sw.js:3` to the next version (e.g., `lifecycle-v14` → `lifecycle-v15`). Required by the project's deploy convention so installed PWAs pick up the new HTML/JS.

---

## Error Handling Summary

| Failure | Behavior |
|---|---|
| User selects a non-image file | Toast "Photos only"; file is skipped |
| Selected file > 25 MB raw | Toast "File too large — try a smaller photo"; skipped |
| Resize fails (e.g., corrupt image) | Toast "Couldn't process photo"; dropped from queue |
| Text save succeeds, photo upload fails | Record is kept; failed photo remains in queue with a Retry chip; toast notes the failure |
| User is offline at save time | Save is disabled; toast "Offline — connect to save" |
| Airtable thumbnails not yet generated | Hero uses `url` (original) as a fallback until thumbnails appear |

## Testing

Manual test cases (no unit test infrastructure exists in this codebase):

1. Take a fresh photo on mobile from each form (Observation, Milestone, Spray) → entry saves, hero thumb appears in feed within ~1 s.
2. Select multiple photos from the library → all resize, all upload sequentially, all appear in lightbox with `+N more` badge correct.
3. Open lightbox → swipe / arrow through photos → close with Esc, backdrop tap, ✕ button.
4. Edit existing entry → change a field and add a photo → both persist after refresh.
5. Edit existing entry → remove one of three photos → on save, only two remain in Airtable.
6. Add a 12 MB raw photo → resize succeeds, upload succeeds (final file ~600 KB).
7. Force a Save while offline (devtools throttle) → save button disabled, toast fires.
8. Force an upload failure (block content.airtable.com) → text saves, failed photo shows Retry chip.

## Deployment

- Add Airtable field, capture field ID.
- Update `vineyard-journal.html` (forms, resize helper, upload flow, feed display, lightbox, edit slide-over).
- Update `api/airtable.js` (uploadAttachment branch).
- Bump `sw.js` CACHE version.
- Update `CLAUDE.md` with new `F_VL_PHOTOS` field ID and a brief note on the photo flow.
- Commit, deploy to Vercel.
