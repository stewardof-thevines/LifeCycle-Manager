# Screen Integration Design
**Date:** 2026-03-31
**Project:** LifeCycle Manager — Domaine Mathiot
**Scope:** Integrate 8 built screens, build 5 new screens, rename all files to lowercase-hyphenated convention, implement app-wide vintage state system.

---

## 1. Architecture & Phasing

### Phase 1 — Rename + Nav + Ready Screens
One deploy. All existing files renamed. Three ready-built screens copied in. Nav drawer updated across all files. Vercel deploy verified before Phase 2.

| Old Filename | New Filename | Source |
|---|---|---|
| `Vineyard_1.4.html` | `vineyard.html` | `vineyard-labor-log-v3.html` (replaces) |
| `Harvest_1.4.html` | `harvest.html` | `harvest-events-v2.html` (replaces) |
| `Cellar_1.6.html` | `cellar.html` | existing |
| `BlendingLab_1.3.html` | `blending-lab.html` | `blending-lab.html` (replaces) |
| `SKUs_1.4.html` | `skus.html` | existing |
| `Finance_1.0.html` | `finance.html` | existing |
| `index.html` | `index.html` | existing (unchanged) |
| *(new)* | `financial-dashboard.html` | ready-built |
| *(new)* | `suppliers.html` | ready-built |
| *(new)* | `overhead-opex.html` | ready-built |

- Old filenames are deleted from the repo after content is migrated.
- All internal `href` links (nav drawers, topbar logos, dashboard cards) updated to new filenames.
- `sw.js` cache version bumped to `lifecycle-v9`.

### Phase 2 — Build New Screens + Vintage System
Second deploy. Four new HTML screens built. Vintage topbar control (a shared JS/HTML snippet, not a standalone page) added to all screens. Four new Airtable tables provisioned.

New files built from scratch:
- `inventory.html`
- `labor-rates.html`
- `task-library.html`
- `vintage-manager.html`

`vintage-context.html` is **not** a standalone page — replaced by the topbar vintage control embedded in every screen's topbar as a reusable snippet.

**First-boot / empty vintage table:** On page load, after fetching `TBL_VINTAGES`, if no record exists with state = Active for the current calendar year, the app auto-creates one (year = current year, state = Active) before rendering the topbar control. This ensures the vintage system is self-initializing and requires no manual setup step.

---

## 2. Nav Drawer

Standard nav drawer (`.nav-drawer`) on every screen. Sections and order are fixed. The active screen marks itself with `.active` on its nav item.

```
Lifecycle.                              ✕

─ FIELD ─────────────────────────────────
🌿  Vineyard              /vineyard.html
⚖️  Harvest               /harvest.html
🗓  Vintage Manager       /vintage-manager.html

─ CELLAR ────────────────────────────────
🍷  Cellar                /cellar.html
🧪  Blending Lab          /blending-lab.html

─ SALES ─────────────────────────────────
📦  SKUs                  /skus.html

─ OPERATIONS ────────────────────────────
🏭  Inventory             /inventory.html
🤝  Suppliers             /suppliers.html

─ FINANCE ───────────────────────────────
📊  Financial Dashboard   /financial-dashboard.html
📈  Finance               /finance.html
💸  Overhead & OpEx       /overhead-opex.html

─ SETUP ─────────────────────────────────
⏱  Labor Rates            /labor-rates.html
📋  Task Library           /task-library.html

─────────────────────────────────────────
Lifecycle Manager · v1.0
```

**Setup section styling:** same `.nav-item` component but section label and items rendered at slightly reduced opacity (`0.7`) to visually subordinate them as reference/configuration screens. A hairline rule separates Setup from Finance.

---

## 3. Vintage State System

### 3.1 Topbar Control

Present on every screen, positioned left of action buttons:

```
[☰]  Lifecycle.  |  [MODULE NAME]        [2026 ▾] [🔓]   [actions...]
```

- **Vintage pill** (`[2026 ▾]`): clicking opens a dropdown listing all vintages with state badge
- **Lock icon** (`[🔓]`): clicking triggers lock/unlock flow
- **Offline indicator**: `● Offline` replaces lock icon when no network

### 3.2 Vintage States

| State | Badge | Editable | Who sets it |
|---|---|---|---|
| Active | 🟢 | Yes | Automatic (current vintage) |
| Locked | 🔒 | No (can unlock) | Auto when historic vintage selected; manual |
| Finalized | 🔐 | Change-log only | Manual via `vintage-manager.html` |

**Rules:**
- Exactly one vintage is unlocked at any time.
- App boots with the current year's vintage as Active.
- Selecting a historic vintage in the dropdown switches view to that vintage in Locked state — no prompt needed to *view*.
- To **unlock** a historic vintage: confirmation modal appears:
  > *"Unlocking [YEAR] will lock [CURRENT]. Continue?"*
  On confirm: current vintage moves to Locked, selected vintage becomes Active (unlocked). Nothing is deleted or discarded.
- To **re-lock** a historic vintage: single tap on lock icon, no confirmation needed. Current year's vintage auto-returns to Active.
- **Finalize** is only available from `vintage-manager.html`. It is a one-way action.

### 3.3 Visual Guard Rails

**When viewing a Locked historic vintage:**
- Amber banner below topbar: *"Viewing [YEAR] Vintage — Locked"*
- All form inputs have `disabled` attribute applied
- Save/submit buttons hidden

**When viewing a Finalized vintage:**
- Red banner below topbar: *"Viewing [YEAR] Vintage — Finalized"*
- All inputs disabled
- Save buttons replaced with *"Request Edit"* button (opens change-log entry panel)

### 3.4 Finalized Vintage Change-Log

Clicking *"Request Edit"* opens a right-side panel:
- Field being changed (pre-populated from context)
- Original (finalized) value — read-only
- New value — editable
- Reason — required text field
- Submit writes a new record to `TBL_VINTAGE_CHANGELOG`

Original finalized records are **never overwritten**.

### 3.5 Offline Behavior

- Vintage selector visible; all historic vintages are view-only with inputs disabled
- Current vintage remains fully editable (writes queue or post when online)
- `● Offline` indicator shown in topbar
- Lock/unlock actions disabled offline

### 3.6 Data Storage

Vintage state is authoritative in Airtable (`TBL_VINTAGES`). `localStorage` is used as a read cache for the active vintage selection to avoid a fetch on every page load. On page load: read from localStorage, then verify against Airtable and update if stale.

---

## 4. New Airtable Tables

### `TBL_VINTAGES`
| Field | Type | Notes |
|---|---|---|
| Year | Number | e.g. 2026 |
| State | Single select | Active / Locked / Finalized |
| Harvest Window Start | Date | |
| Harvest Window End | Date | |
| Tons Target | Number | |
| Tons Actual | Number | Rolled up from harvest events |
| Finalized At | Date | Set on finalization |
| Linked Lots | Link to TBL_LOTS | |

### `TBL_VINTAGE_CHANGELOG`
| Field | Type | Notes |
|---|---|---|
| Vintage | Link to TBL_VINTAGES | |
| Module | Single select | Finance / Cellar / Sales / Field / Operations |
| Table Name | Text | Airtable table the changed record lives in |
| Record ID | Text | Airtable record ID of the changed record |
| Field Name | Text | Human-readable field label |
| Original Value | Text | Value at time of finalization |
| New Value | Text | Requested updated value |
| Changed At | Date | |
| Reason | Long text | Required |

### `TBL_INVENTORY`
| Field | Type | Notes |
|---|---|---|
| Item Name | Text | |
| Category | Single select | Bottles / Corks / Labels / Capsules / Boxes / Other |
| Current Stock | Number | Updated on each receive |
| Unit | Single select | ea / case / roll / box |
| Unit Cost (Last) | Currency | Cost per unit from most recent shipment |
| Reorder Threshold | Number | Triggers low-stock flag |
| Linked Supplier | Link to suppliers table | |
| Linked SKUs | Link to TBL_SKUS | |

### `TBL_LABOR_RATES`
| Field | Type | Notes |
|---|---|---|
| Rate Name | Text | e.g. "Seasonal Contract" |
| Department | Single select | Vineyard / Cellar / Tasting Room / Events / Admin |
| Hourly Rate | Currency | |
| Burden Multiplier | Number | e.g. 1.28 for 28% burden |
| Fully Burdened Rate | Formula | Hourly Rate × Burden Multiplier |
| Effective Date | Date | |
| Active | Checkbox | |

### `TBL_TASKS`
| Field | Type | Notes |
|---|---|---|
| Task Name | Text | e.g. "Pruning", "Punch Down" |
| Department | Single select | Vineyard / Cellar / Tasting Room / Events / Admin |
| Default Duration (hrs) | Number | Optional estimate |
| Active | Checkbox | Inactive tasks hidden from dropdowns |

---

## 5. New Screen Specs

### `inventory.html`
**Layout:** 380px dark left panel + cream main area
**Left panel:** Form to receive a new shipment — item (linked to existing inventory item or new), supplier (linked), quantity received, unit cost, received date. Save button writes to `TBL_INVENTORY`.
**Main area:** Table of all inventory items. Columns: Item, Category, Current Stock, Unit, Reorder Threshold, Supplier, Status. Rows with stock ≤ reorder threshold flagged with amber highlight and "LOW" badge. Filter chips by category. Nav active: Operations.

### `labor-rates.html`
**Layout:** 380px dark left panel + cream main area
**Left panel:** Form — rate name, department (select), hourly rate, burden multiplier, effective date. Fully burdened rate preview updates live as fields are filled. Save button writes to `TBL_LABOR_RATES`.
**Main area:** Rates grouped by department. Each group shows a sub-table of rates with columns: Name, Hourly Rate, Burden %, Fully Burdened Rate, Effective Date, Active. Inactive rates dimmed. Nav active: Setup.

### `task-library.html`
**Layout:** 380px dark left panel + cream main area
**Left panel:** Form — task name, department, default duration estimate (optional), active toggle. Save writes to `TBL_TASKS`.
**Main area:** Tasks grouped by department. Active tasks shown normally; inactive tasks dimmed with strikethrough on name. Toggle to show/hide inactive. Nav active: Setup.

### `vintage-manager.html`
**Layout:** 380px dark left panel + cream main area
**Left panel:** Form to create a new vintage — year, harvest window start/end, tons target. Save writes to `TBL_VINTAGES` with state = Active.
**Main area:** One card per vintage. Each card shows: year (large), state badge, harvest window, tons target vs. actual, linked lot count. Finalize button on each non-finalized card. Finalize triggers two-step confirmation:
  1. *"Finalizing 2024 is permanent. All records will be locked against direct edits. Future changes require a change-log entry. Continue?"*
  2. Type `FINALIZE 2024` to confirm.
Nav active: Field.

---

## 6. Financial Dashboard — Change-Log Integration

When viewing a **Finalized** vintage, the Financial Dashboard shows a flag banner if `TBL_VINTAGE_CHANGELOG` has entries for that vintage:

> *"This vintage has [N] change-log entries. Numbers below reflect finalized values."*

A three-option toggle appears:

| Option | Behavior |
|---|---|
| **Finalized** | Original closed numbers only |
| **All Changes** | Finalized baseline + every change-log entry applied |
| **Select Changes** | Opens change-log panel; user selects which entries to apply |

**Select Changes panel:**

Change-log entries listed, grouped by module. Single-change fields show a standard checkbox. Fields with multiple change-log entries show a collapsed group row with a `▶` arrow and entry count — the group row has no checkbox. Clicking the arrow expands to show individual entries, each with its own checkbox. Within a multi-entry group, only one entry can be checked at a time (radio behavior — selecting one deselects others in the same field group).

Dashboard recalculates in real time as checkboxes are toggled. Checked entries are additive to the finalized baseline.

---

## 7. File Inventory (Final State)

```
/
├── index.html
├── vineyard.html
├── harvest.html
├── cellar.html
├── blending-lab.html
├── skus.html
├── finance.html
├── financial-dashboard.html
├── suppliers.html
├── overhead-opex.html
├── inventory.html
├── labor-rates.html
├── task-library.html
├── vintage-manager.html
├── sw.js                    ← cache version bumped to lifecycle-v9
├── manifest.json
├── api/
│   └── airtable.js
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-31-screen-integration-design.md
```

Total: 14 module HTML files + index + infrastructure files.

---

## 8. Out of Scope

- Re-enabling Clerk authentication (pending custom domain)
- Vintage-aware filtering inside individual module tables (Phase 3)
- Mobile-responsive layout changes
- `winery-app.html` UI shell — added to repo as reference only, not linked from nav
