# Lifecycle Manager — Claude Code Instructions

## Project Overview

**Lifecycle Manager** is a custom Progressive Web App (PWA) for winery operations management at **Domaine Mathiot**, a small winery in Champoeg, Oregon. It replaces Airtable's native UI with a purpose-built interface. Airtable is the backend database. A Vercel serverless proxy (`/api/airtable.js`) sits between the frontend and Airtable to keep the API key secure.

- **Live app:** `life-cycle-manager.vercel.app`
- **GitHub repo:** `github.com/stewardof-thevines/LifeCycle-Manager`
- **Airtable base ID:** `appJNEHG8sqXmdYGe` (Winery Lifecycle Manager)
- **Stack:** HTML + CSS + Vanilla JS + Airtable API + Vercel
- **Architecture:** No build system. Every screen is a self-contained HTML file with embedded `<style>` and `<script>`. Changes are made directly to HTML files.

---

## Service Worker Rule — CRITICAL

**Every time CSS or JS changes are deployed, bump the service worker version in `sw.js`.**

Current version: `lifecycle-v12` (deployed with bug fixes — harvest concurrent events, skus lot resolution + wine cost auto-calc + available gal display, harvest nav links corrected)
Next version: `lifecycle-v13`

Without this bump, phones with the PWA installed will keep running the old cached version.

---

## File Naming Convention

All files use **lowercase-hyphenated** naming. The old `PascalCase_version.html` convention has been retired.

---

## File Inventory

### All Deployed Screens

| File | Purpose |
|------|---------|
| `index.html` | Landing page / macro dashboard |
| `vineyard.html` | Block management, labor logs, cost-per-acre |
| `harvest.html` | Scale house, harvest events, season overview |
| `cellar.html` | Wine lots, vessel tracking, stage management |
| `blending-lab.html` | Blend recipes, bench trials, commit to cellar |
| `skus.html` | Product SKUs, COGS, margin analysis |
| `finance.html` | Finance / P&L |
| `financial-dashboard.html` | Financial overview + change-log toggle for finalized vintages |
| `suppliers.html` | Supplier management |
| `overhead-opex.html` | Overhead and operating expenses |
| `vintage-manager.html` | Create/manage vintages, finalize, view state badges |
| `inventory.html` | Dry goods & packaging stock, receive shipments, low-stock flags |
| `labor-rates.html` | Labor rate categories, burdened rate calculator (live preview) |
| `task-library.html` | Master task list by department, edit-in-panel |
| `winery-app.html` | UI reference shell (not a nav destination) |
| `api/airtable.js` | Vercel proxy — GET/POST/PATCH/DELETE |
| `sw.js` | Service worker — cache `lifecycle-v10` |
| `manifest.json` | PWA manifest |

All 14 module screens include the **vintage topbar control** (pill + lock/unlock + state banners).

---

## Nav Drawer Structure

Every screen gets this drawer. Mark the active screen with `.active` on its nav item.

```
Lifecycle.                          ✕

─ FIELD ──────────────────────────
🌿  Vineyard          /vineyard.html
⚖️   Harvest           /harvest.html
🗓  Vintage Manager   /vintage-manager.html

─ CELLAR ─────────────────────────
🍷  Cellar            /cellar.html
🧪  Blending Lab      /blending-lab.html

─ SALES ──────────────────────────
📦  SKUs              /skus.html

─ OPERATIONS ─────────────────────
🏭  Inventory         /inventory.html
🤝  Suppliers         /suppliers.html

─ FINANCE ────────────────────────
📊  Financial Dashboard  /financial-dashboard.html
📈  Finance              /finance.html
💸  Overhead & OpEx      /overhead-opex.html

─ SETUP ──────────────────────────
⏱  Labor Rates       /labor-rates.html
📋  Task Library      /task-library.html

──────────────────────────────────
Lifecycle Manager · v1.0
```

The Setup section sits below a hairline rule, slightly muted — same nav-item pattern but visually subordinate.

---

## Vintage State System

### Topbar Control
Every screen has a vintage pill + lock icon in the topbar. Reads from `TBL_VINTAGES` on load. Stores active selection in `localStorage` as cache with Airtable as source of truth.

```
[☰]  Lifecycle.  |  [MODULE]     [2026 ▾] [🔓]   [action buttons]
```

### Three States
- **Active 🟢** — current working vintage, fully editable
- **Locked 🔒** — historic vintage, read-only by default
- **Finalized 🔐** — permanently closed; edits go through change-log only

### Rules
- Only one vintage can be unlocked at a time
- App always boots with current year as Active
- Selecting a historic vintage shows it as Locked (no prompt to view)
- Unlocking historic vintage requires confirmation: *"Unlocking 2023 will lock 2026. Continue?"* — current vintage pauses into Locked, nothing is erased
- You cannot unlock a second vintage until the first is re-locked
- Finalize action lives only in `vintage-manager.html` — two-step confirmation, irreversible
- First-boot: if no Active vintage exists for current year, auto-create one

### Visual Guards for Locked/Finalized Vintages
- Amber banner below topbar: "Viewing 2024 Vintage — Locked"
- All form inputs disabled at DOM level
- Save/submit buttons hidden

### Offline Behavior
- Historic vintages are view-only
- Current vintage remains fully editable
- Offline indicator in topbar: `● Offline`

### Finalized Vintage Edits (Change-Log)
- "Request Edit" replaces Save on finalized vintages
- Writes to `TBL_VINTAGE_CHANGELOG` — original numbers untouched
- Financial Dashboard shows a flag when change-log entries exist
- Toggle options: **Finalized** / **All Changes** / **Select Changes**
- Select Changes opens a slide-in panel grouped by module
- Fields with multiple changes show collapsed with arrow to expand; only one revision per field can be selected (radio behavior within group)

---

## Airtable Tables

All reads/writes go through `/api/airtable.js`. Always use `returnFieldsByFieldId=true` (proxy adds this automatically). Define field ID constants at the top of each screen's `<script>` block.

### Core Tables
| Constant | Table ID | Notes |
|---|---|---|
| `TBL_BLOCKS` | `tblPuFD0fbiLmITXK` | Vineyard blocks |
| `TBL_LABOR_LOGS` | `tblVbpvTPxEQpw6Hz` | Labor log entries |
| `TBL_LOTS` | `tblcBMCwq1ng8ykMb` | Wine lots |
| `TBL_HARVEST_EVENTS` | `tblTDMmErrAssEEAB` | Harvest events |
| `TBL_SKUS` | `tblLOqkPGMsgNvl2g` | Product SKUs |
| `TBL_VESSELS` | `tblWyQjpgBOWutl7s` | Barrels and tanks |
| `TBL_BLEND_RECIPES` | `tblTaAYQmjVxNAmJt` | Blend recipes |
| `TBL_SUPPLIERS` | `tbl966ZHygCRxEv8S` | Supplier records |
| `TBL_OVERHEAD_OPEX` | `tblLgn1j6SYVOr79n` | Overhead & OpEx |
| `TBL_BALANCE_SHEET` | `tblLTGFWPYqjgEcGB` | Balance sheet entries |
| `TBL_BLEND_COSTS` | `tbl4wU6E4Unu2XZdH` | Blend direct costs |
| `TBL_DRY_GOODS` | `tbld7eYPAspQny1Ii` | Dry goods inventory (existing, rich schema) |
| `TBL_SHIPMENTS` | `tblibVNV2aJrPJgEv` | Shipments received |

### Phase 2 Tables
| Constant | Table ID | Notes |
|---|---|---|
| `TBL_VINTAGES` | `tblJ8NBvXinvXpGPq` | Pre-existing, richer schema — see field IDs below |
| `TBL_VINTAGE_CHANGELOG` | `tblBxqjVtPtnvcIjN` | Newly created |
| `TBL_INVENTORY` | `tblZt25WPP5VEg8OF` | Newly created (simple) |
| `TBL_LABOR_RATES` | `tblwX75CPEYHhIXmD` | Pre-existing, different field names — see below |
| `TBL_TASKS` | `tblmsz91HIoI4LjHs` | Pre-existing, richer schema — see below |

### Key Field IDs — TBL_VINTAGES (`tblJ8NBvXinvXpGPq`)
**Note: "Vintage Year" is a text field (not number). "Status" is the state field (not "State").**
| Field | ID | Type |
|---|---|---|
| Vintage Year | `fldgc54uvUaT7GwQX` | singleLineText |
| Status | `fldho6518UjJmfRqX` | singleSelect (Active / Locked / Finalized) |
| Harvest Start Date | `fldYMgmK6fH2ZfNm6` | date |
| Harvest End Date | `fldvNTmOxXCGNDWMf` | date |
| Total Tons Target | `fldGiKHuV1nO6XkYa` | number |
| Season Notes | `fldBUnsOgnrNkNezG` | multilineText |
| Harvest Events (Link) | `fldWObOsA7GAylIRd` | multipleRecordLinks |
| Wine Lots (Link) | `flds5uGyFP119emOO` | multipleRecordLinks |
| Vintage Changelog | `fld1GxEOGO9A85Qmk` | multipleRecordLinks |

### Key Field IDs — TBL_VINTAGE_CHANGELOG (`tblBxqjVtPtnvcIjN`)
| Field | ID | Type |
|---|---|---|
| Entry ID | `fldprsPjnC30tG88J` | singleLineText |
| Module | `fldO2Inyw8K7wgx82` | singleSelect |
| Table Name | `fldkdGyuQcoTElJqL` | singleLineText |
| Record ID | `fldGYOqM6jGzVZCVg` | singleLineText |
| Field Name | `fldIy9TZEm8RtPAcX` | singleLineText |
| Original Value | `fldFdYAP8HLCWElBE` | singleLineText |
| New Value | `fld8o1ARlaInLMhJk` | singleLineText |
| Changed At | `fld9Uop0IzEwtjvmV` | date |
| Reason | `fld5pZ2ckM8kpJthT` | multilineText |
| Vintage | `fldwdN1mVkYSDptQ0` | multipleRecordLinks |

### Key Field IDs — TBL_INVENTORY (`tblZt25WPP5VEg8OF`)
| Field | ID | Type |
|---|---|---|
| Item Name | `fld2OlR9TizF8UId7` | singleLineText |
| Category | `fld5v9F2JG4Bz71cK` | singleSelect |
| Current Stock | `fldQv6nbkME6k43bd` | number |
| Unit | `fldiJXLOryOTbmbXQ` | singleSelect |
| Unit Cost Last | `fldgGhAuvyp4DqL2n` | currency |
| Reorder Threshold | `fldK3RE8VHYB8Zp9g` | number |

### Key Field IDs — TBL_LABOR_RATES (`tblwX75CPEYHhIXmD`)
**Note: No "Department" field. Primary field is "Category Name" (not "Rate Name"). Burden is a percent field called "Tax & Insurance Multiplier". No "Active" checkbox field.**
| Field | ID | Type |
|---|---|---|
| Category Name | `fldQA7KgGa6CzLkut` | singleLineText |
| Hourly Rate | `fldoSTNC6UTrEmGmL` | currency |
| Tax & Insurance Multiplier | `fldhC8utqAsDDsip1` | percent (e.g. 0.25 = 25%) |
| Fully Burdened Rate | `fldXELasLWF8wO1UP` | formula (read-only) |

### Key Field IDs — TBL_TASKS (`tblmsz91HIoI4LjHs`)
**Note: No "Default Duration hrs" field. "Active?" is the checkbox (not "Active").**
| Field | ID | Type |
|---|---|---|
| Task Name | `fldi3tHNfdITzZ0DX` | singleLineText |
| Department | `fldo9F41LBtLTm5kL` | singleSelect (Vineyard / Cellar / Tasting Room / Events / Admin) |
| Active? | `fldjhr6hV10Kk3Lr0` | checkbox |

---

## Airtable Field ID Rules

- Always use field IDs (`fldXXXXX`), never field names
- Define them as constants at the top of each screen's `<script>` block
- `singleSelect` fields return objects — always unwrap `.name`: `field?.name || ''`
- Linked record fields return arrays of record IDs — check `Array.isArray()` before accessing
- Use `FIND('${id}', ARRAYJOIN({LinkedField}))` for filtering by linked record ID in `filterByFormula` — the `=` operator does not work for linked fields
- Re-pull schema if data isn't loading — field IDs change when fields are deleted and recreated

---

## Design System

### Color Tokens
```css
--grenadine: #D44720;   /* Primary action, active states, eyebrow labels */
--beeswax:   #E9A752;   /* Secondary accent, cost preview, amber highlights */
--darlington:#ACCAB2;   /* Sage green — vineyard, positive states */
--latte:     #786140;   /* Neutral brown — muted labels */
--cream:     #F5EFE4;   /* Page background */
--dark:      #1e1710;   /* Topbar, dark panels */
--white:     #ffffff;   /* Card backgrounds */
```

### Typography
- **Playfair Display** — page titles, screen headings
- **Barlow Condensed** — labels, stats, chips, nav items (uppercase)
- **Barlow** — body copy, form inputs

### Layout
- Topbar: 58px, dark, sticky. Logo + breadcrumb + action buttons.
- Standard grid: `380px dark left panel | fluid cream main area`
- Optional: `360px dark right panel`
- Forms live in dark panels — never in modals
- Cards: white on cream with subtle border/shadow

### Logo Text
Standardized as: `Lifecycle<span>.</span>` — the dot is in `--grenadine`. Do not use "Domaine Mathiot" in the topbar logo.

### Never Use
- Modals for forms
- Clerk auth script (disabled until custom domain is purchased — do NOT re-enable)
- Version suffixes in filenames (use `vineyard.html` not `Vineyard_1.5.html`)
- Old PascalCase filenames in any nav links

---

## Proxy API

Every screen calls the proxy at: `const PROXY = '/api/airtable';`

```
GET  ?baseId=&tableId=&fields=&sort=&maxRecords=&filterByFormula=
POST { baseId, tableId, fields }
PATCH { baseId, tableId, recordId, fields }
DELETE { baseId, tableId, recordId }
```

The proxy appends `returnFieldsByFieldId=true` to all GET requests — responses use field IDs, not names.

---

## Known Issues

- `manifest.json` `start_url` still points to `Vineyard_1.4.html` — update to `/index.html`
- `index.html` dashboard stat blocks may show `—` if Airtable table IDs mismatch — needs live data wiring
- Clerk auth scaffold exists in `login.disabled.html` — do not activate until custom domain is purchased

---

## Implementation Status

### Phase 1 — Complete (deployed as lifecycle-v9)
- All files renamed to lowercase-hyphenated convention
- 3 replacement screens copied in (vineyard, harvest, blending-lab from design folder)
- 3 ready screens added (financial-dashboard, suppliers, overhead-opex)
- Nav drawer standardized across all screens
- `winery-app.html` added to repo as reference shell

### Phase 2 — Complete (deployed as lifecycle-v10, merged 2026-04-01)
Plan documents:
- `docs/superpowers/specs/2026-03-31-screen-integration-design.md`
- `docs/superpowers/plans/2026-03-31-phase1-rename-nav-ready-screens.md`
- `docs/superpowers/plans/2026-03-31-phase2-new-screens-vintage-system.md`

Completed:
1. ✅ Provisioned 5 Airtable tables (TBL_VINTAGES, TBL_VINTAGE_CHANGELOG, TBL_INVENTORY, TBL_LABOR_RATES, TBL_TASKS) — pre-existing tables adopted, see field IDs above
2. ✅ Built `vintage-manager.html` — create/manage vintages, two-step finalize confirmation
3. ✅ Added vintage topbar control to all 14 screens — pill, dropdown, lock/unlock flow, banners
4. ✅ Built `inventory.html` — receive shipments, low-stock flags, filter chips
5. ✅ Built `labor-rates.html` — burdened rate calculator, grouped by Category Name
6. ✅ Built `task-library.html` — tasks by department, edit-in-panel, Show Inactive toggle
7. ✅ Added change-log toggle to `financial-dashboard.html` — Finalized/All Changes/Select Changes panel
8. ✅ Bumped `sw.js` to `lifecycle-v10`, all 14 screens in SHELL array

### Phase 3 — Not started
Candidate work:
- Vintage-aware data filtering in each module (Vineyard, Harvest, Cellar, etc.) — currently modules show all records regardless of vintage
- Financial dashboard real recalculation from change-log entries (currently UI is wired but recalc is a stub)
- Date range filtering across all modules
- `manifest.json` start_url fix (still points to old PascalCase filename)

---

## Glossary

| Term | Definition |
|------|-----------|
| Wine Lot | A batch of wine identified by a Lot ID (e.g. 26-PN-1). Tracks from fermentation through bottling. |
| Vessel | A barrel or tank used to hold a wine lot during aging. |
| SKU | A product configuration — bottle size, lot source, MSRP, and channel allocations. |
| Burdened Rate | A labor rate that includes base wage plus employer taxes and insurance (e.g. $25/hr + 25% burden = $31.25/hr). |
| COGs | Cost of Goods Sold — total per-bottle cost including fruit, labor, cellar, and packaging. |
| Blend Recipe | A formula combining multiple wine lots at specified percentages to create a blend. |
| Harvest Event | A single pick — records the block, date, tonnage, brix, and juice yield. |
| Vintage | A harvest year (e.g. 2024, 2025, 2026). Vintages have Active/Locked/Finalized states. |
| Finalized Vintage | A vintage whose numbers are permanently closed. Edits go through a change-log. |
