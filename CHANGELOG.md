# Lifecycle Manager — Changelog

All notable changes to the Lifecycle Manager app are documented here.
Versions correspond to the service worker cache version (e.g. `lifecycle-v15`).

---

## [v15] — 2026-04-20

**Debug pass — nav gaps, manifest, stray script tag**

### Fixed
- **Nav drawer (8 screens):** Added missing Winemaker Journal link (`/cellar-journal.html`) to `harvest.html`, `financial-dashboard.html`, `suppliers.html`, `overhead-opex.html`, `vintage-manager.html`, `inventory.html`, `labor-rates.html`, `task-library.html`. The link existed on `vineyard.html`, `cellar.html`, `blending-lab.html`, `skus.html`, `finance.html` — the other 8 were skipped during the original nav standardization pass.
- **`manifest.json` `start_url`:** Changed from `/Vineyard_1.3.html` (a deleted legacy file → 404 on PWA launch) to `/index.html`.
- **`vineyard.html` stray `</script>`:** Removed an orphaned `</script>` tag left over from the Clerk auth scaffold removal. Invalid HTML; browsers recovered silently but it was a real parse error.

### Updated
- `sw.js` bumped to `lifecycle-v15` (nav HTML changed on 8 screens)
- `CLAUDE.md` known issues updated: manifest start_url issue removed, SW version updated

---

## [v14] — 2026-04-13 / 2026-04-14

**Vineyard Journal + nav drawer standardization**

### Added
- **`vineyard-journal.html`** — Full vineyard logging screen:
  - Auto weather logging: fetches Open-Meteo on every page load, idempotently writes the past 7 days + today to `TBL_VL` in Airtable
  - Powdery mildew (PM) pressure scoring using the Gubler-Thomas simplified daily algorithm (0–100, clamped; classified as Low / Medium / High)
  - 7-day forecast strip with PM pressure pills per day
  - Spray recommendation banner (detects first HIGH pressure day, recommends spraying the day before)
- **Vineyard tab bar** added to `vineyard.html` and `vineyard-journal.html` (Blocks / Labor Log / Vineyard Journal tabs)
- `TBL_VL` field IDs documented in `CLAUDE.md`

### Fixed
- **Nav drawer standardization (13 screens):** Replaced broken PascalCase nav drawers in `blending-lab.html`, `skus.html`, `finance.html`. Added Vineyard Journal link to all 13 screens that had existing correct nav structure. All 16 screens now have a current, correct nav drawer.

---

## [v12] — 2026-04-03

**Bug fixes across core screens**

### Fixed
- `index.html`: dashboard stat block loading issues
- `cellar.html`: various data rendering fixes
- `vineyard.html`: cost-per-acre refresh on log submit
- `harvest.html`: filter formula corrections
- `skus.html`: channel name normalization

---

## [v10] — 2026-04-01

**Phase 2 — Vintage system, new screens, change-log**

### Added
- **`vintage-manager.html`** — Create and manage harvest vintages; two-step irreversible Finalize confirmation; lock/unlock controls; state badges (Active 🟢 / Locked 🔒 / Finalized 🔐)
- **`inventory.html`** — Dry goods & packaging inventory: receive shipments, low-stock flags, filter chips
- **`labor-rates.html`** — Labor rate categories with live burdened rate calculator (base wage × tax & insurance multiplier)
- **`task-library.html`** — Master task list grouped by department (Vineyard / Cellar / Tasting Room / Events / Admin); edit-in-panel; Show Inactive toggle
- **Vintage topbar control** added to all 14 module screens — pill dropdown, lock/unlock flow, state banners, amber "Viewing X Vintage — Locked" banner for non-active vintages
- **Change-log toggle** added to `financial-dashboard.html` — Finalized / All Changes / Select Changes panel; Select Changes opens slide-in panel grouped by module; radio-behavior within field groups
- Provisioned 5 Airtable tables: `TBL_VINTAGES`, `TBL_VINTAGE_CHANGELOG`, `TBL_INVENTORY`, `TBL_LABOR_RATES`, `TBL_TASKS` (pre-existing tables adopted; field IDs documented in `CLAUDE.md`)

### Architecture
- Vintage state system: only one vintage unlocked at a time; app boots with current year as Active; first-boot auto-creates Active vintage if none exists
- Finalized vintage edits write to `TBL_VINTAGE_CHANGELOG` — original numbers immutable
- All 14 module screens in `sw.js` SHELL array

---

## [v9] — 2026-03-31

**Phase 1 — File renaming, nav standardization, new ready screens**

### Changed
- All files renamed from `PascalCase_version.html` convention to `lowercase-hyphenated` (e.g. `Vineyard_1.4.html` → `vineyard.html`)
- Nav drawer standardized across all screens; hamburger menu added to all modules; logo links home
- `winery-app.html` added as UI reference shell (not a nav destination)

### Added
- `financial-dashboard.html` — Financial overview scaffold
- `suppliers.html` — Supplier management
- `overhead-opex.html` — Overhead & operating expenses

---

## [v8] — 2026-03-23

**Finance module + cost breakdowns**

### Added
- **`finance.html`** — Full Finance module:
  - Overview tab: revenue summary and COGS
  - P&L tab
  - Balance Sheet tab
  - Cash Flow tab
  - Balance Sheet entry form in left panel
  - CSV export and print/PDF
- Cost breakdown sections added to Cellar lot cards and Harvest event cards
- Season cost summary added to Vineyard block detail
- Blend cost transfer: committing a blend now writes cost data to `TBL_BLEND_COSTS`
- Direct cost entry added to BlendingLab committed blends
- SKU sales channels updated; legacy channel name migration

### Fixed
- SKU cost precision and committed lot resolution on load
- `Cost/Acre` refreshes immediately on labor log submit
- Finance: missing `apiPatch` helper, Balance Sheet sort fallback, code quality pass

---

## Pre-v8 — Early development

Initial build of the core modules as versioned PascalCase HTML files:

- **Vineyard** (`Vineyard_1.x`) — Block management, labor logs
- **Harvest** (`Harvest_1.x`) — Scale house, harvest events
- **Cellar** (`Cellar_1.x`) — Wine lots, vessel tracking, stage management
- **Blending Lab** (`BlendingLab_1.x`) — Blend recipes, bench trials, commit to cellar
- **SKUs** (`SKUs_1.x`) — Product SKUs, COGS, margin analysis
- Vercel serverless proxy (`api/airtable.js`) established
- PWA service worker and manifest set up
- Clerk auth scaffold added (disabled — awaiting custom domain)
- `CLAUDE.md` created with full project context, design system, and Airtable field IDs
