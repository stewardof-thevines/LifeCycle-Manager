# Labor Log — Click-to-Edit Slide-Over Panel

**Date:** 2026-05-28
**File touched:** `vineyard.html` only

## Goal

On the Labor Log tab in `vineyard.html`, allow the user to click a logged entry to open an edit panel where every field is editable, with a Save that PATCHes Airtable. Mirrors the existing slide-over edit pattern in `vineyard-journal.html`. Delete remains as today (existing ✕ button on each row).

## Background

The labor log table currently renders rows with only a delete button. The vineyard journal already has a working slide-over edit panel (`openEditPanel(entryId)` and friends in `vineyard-journal.html`); we adapt that pattern.

## Design

### Trigger

Click anywhere on a `.log-row` opens the edit panel. The existing delete ✕ button uses `event.stopPropagation()` so it doesn't trigger the open.

### Panel structure (matches vineyard-journal pattern)

- `.log-edit-backdrop` — full-screen dim overlay
- `.log-edit-panel` — 420px wide slide-over from the right, dark surface
- Header: title ("Edit Labor Entry"), close ✕
- Body: form fields (see below)
- Footer: Cancel, Save Changes

CSS reuses the visual treatment from `vineyard-journal.html`'s `.edit-*` classes, scoped with a `log-` prefix to avoid collisions if styles ever converge.

### Fields (pre-filled from the entry)

Mirrors the new-entry form on the right panel:

| Field | Notes |
|-------|-------|
| Date | required |
| Labor Provider | required, dropdown — value format `Name\|rate\|id` matches new form |
| Department | pills (Vineyard/Cellar/Admin/Sales/Events) |
| Vineyard Block | only when dept = Vineyard. **Read-only for split rows** (see below) |
| Task | required, dropdown filtered by department (same task list as new form) |
| Workers | required, number |
| Hrs / Worker | required, number, 0.5 step |
| Harvest toggle | Vineyard only |
| Notes | optional textarea |

### Split-row handling

A "Split" row in the table currently maps to multiple Airtable records that share the composite key `date | task | blockLabel | category`. The edit panel tracks all of them as a group.

- **Block field is read-only** for split rows. Display: `"Split across Pinot Noir 1, Chardonnay 1, Riesling 1"`. Helper text below: *"To change which blocks were worked, delete this entry and re-log."*
- All other fields (date, provider, dept, task, workers, hours, harvest, notes) **save by PATCH-ing every record in the group** with the identical diff.
- Cost displays unchanged — each underlying record still shows its full per-record total (cost-split bug tracked separately in Known Issues).

### State

```js
let editLogKey       = null;  // composite key of entry being edited
let editLogRecordIds = [];    // 1+ Airtable record ids for this entry (split = many)
let editLogOriginal  = null;  // snapshot of one representative entry for dirty check + diff
let editLogIsSplit   = false;
```

### Dirty check + close

- Escape key closes the panel.
- Closing with unsaved changes prompts `confirm('Discard unsaved changes?')`. Matches vineyard-journal.
- Dirty = any field differs from the original snapshot.

### Save flow

1. Disable Save button, label → "Saving…".
2. Build the `diff` object — keys are Airtable field IDs, only include changed fields.
3. Validate required fields (date, category, task, workers, hours; block if dept=Vineyard and not split).
4. If diff is empty → close panel, no-op.
5. PATCH every record in `editLogRecordIds` with the same diff. `Promise.all`.
6. On success: `showToast('Entry updated')`, close panel, call `loadLogs()` to refresh from Airtable (cheap; gets us the updated formula `Total` field).
7. On any PATCH failure: toast the error, leave panel open, re-enable Save.

### Reload after save (not local patch)

Workers/Hours changes flow through to the Airtable formula `Total`. Rather than recompute locally and risk drift, we call `loadLogs()` after a successful save. One extra round trip; simpler and less error-prone.

### Field ID mapping

Reuses the existing constants in `vineyard.html`:
- `F_LOG_DATE`, `F_LOG_HARVEST`, `F_LOG_CATEGORY`, `F_LOG_TASK`, `F_LOG_WORKERS`, `F_LOG_HOURS`, `F_LOG_BLOCKS`, `F_LOG_NOTES`

Linked fields (category, task, blocks) write as arrays of one ID, matching the existing create path.

## Out of Scope

- Editing the block selection on split rows (would require add/delete Airtable records, not just PATCH — separate change).
- Fixing the cost-split storage bug (tracked under Known Issues; see below).

## Known Issues — to add to `CLAUDE.md`

> **Labor log split-cost storage:** When labor is logged across multiple blocks (e.g. "All Pinot Noir"), each Airtable record stores the full `Workers × Hours` rather than a per-block share. As a result, on page reload the split row reappears as separate rows each showing the full cost, and totals sum incorrectly. Cost-split shares exist only in the JS session that created them. Fix path: write per-block scaled `hours` to each record (or store an explicit `shareFraction` field). Context: 2026-05-28 brainstorm during labor-log edit-panel work.

## Test scenarios

1. **Edit a single-block Vineyard entry** — change workers from 4 → 5, save, verify table re-renders with new cost.
2. **Edit a Cellar entry** — block field hidden, harvest toggle hidden, save still works.
3. **Edit a split entry** — block field shown read-only as "Split across …", change hours, verify all underlying records get PATCH'd (check Airtable console).
4. **Open + close with no changes** — no confirm prompt, panel closes clean.
5. **Open + change a field + Escape** — confirm prompt fires.
6. **Required-field validation** — blank workers → Save shows toast error, doesn't PATCH.
7. **Delete button** — still works on a row; clicking it does NOT also open the edit panel.
