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

Current version after Phase 1 deploy: `lifecycle-v9`
Next version (Phase 2): `lifecycle-v10`

Without this bump, phones with the PWA installed will keep running the old cached version.

---

## File Naming Convention

All files use **lowercase-hyphenated** naming. The old `PascalCase_version.html` convention has been retired.

---

## File Inventory

### Deployed / In Repo

| File | Purpose |
|------|---------|
| `index.html` | Landing page / macro dashboard |
| `vineyard.html` | Block management, labor logs, cost-per-acre |
| `harvest.html` | Scale house, harvest events, season overview |
| `cellar.html` | Wine lots, vessel tracking, stage management |
| `blending-lab.html` | Blend recipes, bench trials, commit to cellar |
| `skus.html` | Product SKUs, COGS, margin analysis |
| `finance.html` | Finance / P&L |
| `financial-dashboard.html` | Financial dashboard overview |
| `suppliers.html` | Supplier management |
| `overhead-opex.html` | Overhead and operating expenses |
| `winery-app.html` | UI reference shell (not a nav destination) |
| `api/airtable.js` | Vercel proxy — GET/POST/PATCH/DELETE |
| `sw.js` | Service worker — bump version on any CSS/JS change |
| `manifest.json` | PWA manifest |

### To Be Built (Phase 2)

| File | Purpose |
|------|---------|
| `inventory.html` | Dry goods & packaging stock, receive shipments, low-stock flags |
| `labor-rates.html` | Labor rate cards by department, burdened rate calculator |
| `task-library.html` | Master task list by department, feeds dropdowns across app |
| `vintage-manager.html` | Create/manage vintages, finalize, view state badges |

`vintage-context.html` is **not** a standalone page — replaced by the topbar vintage control embedded in every screen.

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

### Existing Tables
- `TBL_BLOCKS` — vineyard blocks
- `TBL_LABOR_LOGS` — labor log entries
- `TBL_LOTS` (tblcBMCwq1ng8ykMb) — wine lots
- `TBL_HARVEST_EVENTS` — harvest events
- `TBL_SKUS` (tblLOqkPGMsgNvl2g) — product SKUs
- `TBL_VESSELS` — barrels and tanks
- `TBL_BLEND_RECIPES` — blend recipes
- `TBL_SUPPLIERS` — supplier records

### New Tables (Phase 2 — provision before building)
- `TBL_VINTAGES` — year, state (active/locked/finalized), harvest_window_start, harvest_window_end, tons_target, tons_actual, finalized_at, linked lots
- `TBL_VINTAGE_CHANGELOG` — vintage_id, table_name, record_id, field_name, original_value, new_value, changed_at, reason
- `TBL_INVENTORY` — item name, category, current stock, unit, unit cost (last), reorder threshold, linked supplier, linked SKUs
- `TBL_LABOR_RATES` — name, department, hourly rate, burden multiplier, effective date
- `TBL_TASKS` — name, department, default duration, active/inactive

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

### Phase 2 — In Progress
Plan documents:
- `docs/superpowers/specs/2026-03-31-screen-integration-design.md`
- `docs/superpowers/plans/2026-03-31-phase1-rename-nav-ready-screens.md`
- `docs/superpowers/plans/2026-03-31-phase2-new-screens-vintage-system.md`

Remaining tasks:
1. Provision 4 new Airtable tables (TBL_VINTAGES, TBL_VINTAGE_CHANGELOG, TBL_INVENTORY, TBL_LABOR_RATES, TBL_TASKS)
2. Build `vintage-manager.html`
3. Add vintage topbar control to all 14 screens
4. Build `inventory.html`
5. Build `labor-rates.html`
6. Build `task-library.html`
7. Add change-log toggle to `financial-dashboard.html`
8. Bump `sw.js` to `lifecycle-v10` and deploy

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
