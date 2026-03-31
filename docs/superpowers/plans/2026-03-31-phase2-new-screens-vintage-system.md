# Phase 2: New Screens & Vintage System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 new screens (inventory, labor-rates, task-library, vintage-manager), add the app-wide vintage topbar control to all 14 screens, provision 5 new Airtable tables, and deploy.

**Architecture:** Vanilla HTML/CSS/JS. No build system. Each screen is a self-contained HTML file. The vintage topbar control is a JS/HTML snippet embedded in every file — there is no shared module system, so the snippet is copy-pasted. Airtable is the data store; all reads/writes go through `/api/airtable.js`. No automated test framework — verification is manual browser checks.

**Prerequisite:** Phase 1 plan (`2026-03-31-phase1-rename-nav-ready-screens.md`) must be complete and deployed to Vercel before starting this plan.

**Spec:** `docs/superpowers/specs/2026-03-31-screen-integration-design.md` — read Sections 3, 4, 5, and 6 before starting.

**Base ID:** `appJNEHG8sqXmdYGe`

---

## Airtable Table IDs (fill in after Task 1)

| Constant | Table ID | Description |
|---|---|---|
| `TBL_VINTAGES` | *(fill after Task 1)* | Vintage years and states |
| `TBL_VINTAGE_CHANGELOG` | *(fill after Task 1)* | Change-log entries for finalized vintages |
| `TBL_INVENTORY` | *(fill after Task 1)* | Dry goods and packaging inventory |
| `TBL_LABOR_RATES` | *(fill after Task 1)* | Labor rate categories by department |
| `TBL_TASKS` | *(fill after Task 1)* | Task library for dropdowns |

---

## Vintage Topbar Control Reference

This snippet must be embedded in every screen. It is defined once here and copy-pasted into all 14 files.

### How it works

On page load:
1. Detects online/offline state
2. If online: fetches all records from `TBL_VINTAGES`
3. If no Active record exists for the current calendar year: auto-creates one (POST to Airtable)
4. Reads `localStorage.getItem('lm_active_vintage')` for the cached selection (falls back to current year)
5. Verifies cached selection against fetched data; updates cache if stale
6. Renders the vintage pill + lock icon in the topbar
7. Applies the correct visual state to the page (banners, input disabling)

### Vintage states

- `Active` — current editable vintage (green dot)
- `Locked` — read-only; inputs disabled; amber banner
- `Finalized` — read-only; inputs disabled and replaced with "Request Edit"; red banner

### CSS (add to `<style>` block)

```css
/* ── Vintage Topbar Control ── */
.vintage-pill {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px; padding: 4px 10px 4px 10px;
  cursor: pointer; transition: background 0.15s;
  font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--cream);
  position: relative;
}
.vintage-pill:hover { background: rgba(255,255,255,0.12); }
.vintage-pill-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.vintage-pill-dot.active { background: #4ade80; }
.vintage-pill-dot.locked { background: var(--beeswax); }
.vintage-pill-dot.finalized { background: var(--grenadine); }
.vintage-pill-arrow { opacity: 0.5; font-size: 10px; }

.vintage-lock-btn {
  width: 30px; height: 30px; border-radius: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.55); cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.vintage-lock-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

.vintage-offline {
  font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; color: var(--beeswax); display: flex; align-items: center; gap: 5px;
}
.vintage-offline-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--beeswax); }

/* Vintage dropdown */
.vintage-dropdown {
  position: absolute; top: calc(100% + 8px); left: 0;
  background: #2a2018; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; min-width: 200px; z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; display: none;
}
.vintage-dropdown.open { display: block; }
.vintage-dropdown-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; transition: background 0.12s;
  font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.75);
}
.vintage-dropdown-item:hover { background: rgba(255,255,255,0.07); }
.vintage-dropdown-item.selected { color: var(--beeswax); }
.vintage-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 3px;
}
.vintage-badge.active { background: rgba(74,222,128,0.15); color: #4ade80; }
.vintage-badge.locked { background: rgba(233,167,82,0.15); color: var(--beeswax); }
.vintage-badge.finalized { background: rgba(212,71,32,0.15); color: var(--grenadine); }

/* Vintage state banners */
.vintage-banner {
  display: none; padding: 8px 20px; font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  align-items: center; gap: 10px;
}
.vintage-banner.locked { background: rgba(233,167,82,0.15); color: var(--beeswax); border-bottom: 1px solid rgba(233,167,82,0.2); }
.vintage-banner.finalized { background: rgba(212,71,32,0.1); color: var(--grenadine); border-bottom: 1px solid rgba(212,71,32,0.2); }
.vintage-banner.visible { display: flex; }

/* Modal overlay */
.vintage-modal-overlay {
  display: none; position: fixed; inset: 0; z-index: 600;
  background: rgba(0,0,0,0.6); align-items: center; justify-content: center;
}
.vintage-modal-overlay.open { display: flex; }
.vintage-modal {
  background: #2a2018; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px; padding: 28px; max-width: 380px; width: calc(100% - 40px);
}
.vintage-modal-title {
  font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700;
  color: var(--white); margin-bottom: 12px;
}
.vintage-modal-body {
  font-family: 'Barlow', sans-serif; font-size: 14px; color: rgba(255,255,255,0.65);
  line-height: 1.5; margin-bottom: 24px;
}
.vintage-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.vintage-modal-cancel {
  padding: 9px 18px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: rgba(255,255,255,0.55); cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.vintage-modal-confirm {
  padding: 9px 18px; border-radius: 6px; border: none;
  background: var(--grenadine); color: #fff; cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
}
```

### HTML (topbar vintage control — place after logo, before action buttons)

```html
<!-- Vintage control -->
<div id="vintageControl" style="display:flex;align-items:center;gap:6px;margin-left:auto;">
  <!-- Offline state (hidden when online) -->
  <div class="vintage-offline" id="vintageOffline" style="display:none;">
    <span class="vintage-offline-dot"></span>Offline
  </div>
  <!-- Vintage pill -->
  <div class="vintage-pill" id="vintagePill" onclick="toggleVintageDropdown(event)">
    <span class="vintage-pill-dot active" id="vintageDot"></span>
    <span id="vintageYear">—</span>
    <span class="vintage-pill-arrow">▾</span>
    <div class="vintage-dropdown" id="vintageDropdown"></div>
  </div>
  <!-- Lock button (hidden when offline or Active) -->
  <button class="vintage-lock-btn" id="vintageLockBtn" onclick="handleLockToggle()" style="display:none;" title="Lock/unlock vintage">🔓</button>
</div>
```

### HTML (banner + modal — place immediately after topbar div)

```html
<!-- Vintage state banner -->
<div class="vintage-banner locked" id="vintageBannerLocked">
  🔒 Viewing <span id="bannerYearLocked"></span> Vintage — Locked. All inputs are read-only.
</div>
<div class="vintage-banner finalized" id="vintageBannerFinalized">
  🔐 Viewing <span id="bannerYearFinalized"></span> Vintage — Finalized. Use "Request Edit" to log changes.
</div>

<!-- Vintage unlock confirmation modal -->
<div class="vintage-modal-overlay" id="vintageModalOverlay">
  <div class="vintage-modal">
    <div class="vintage-modal-title" id="vintageModalTitle">Unlock Vintage</div>
    <div class="vintage-modal-body" id="vintageModalBody"></div>
    <div class="vintage-modal-actions">
      <button class="vintage-modal-cancel" onclick="closeVintageModal()">Cancel</button>
      <button class="vintage-modal-confirm" id="vintageModalConfirm">Continue</button>
    </div>
  </div>
</div>
```

### JS (add to `<script>` block)

```js
/* ── Vintage Topbar Control ── */
const BASE_ID = 'appJNEHG8sqXmdYGe';
const TBL_VINTAGES = 'FILL_IN_AFTER_TASK_1';  // replace with real table ID

let vintageData = [];      // all vintage records from Airtable
let activeVintage = null;  // the currently selected vintage record

async function initVintage() {
  const isOnline = navigator.onLine;
  if (!isOnline) {
    document.getElementById('vintageOffline').style.display = 'flex';
    document.getElementById('vintageLockBtn').style.display = 'none';
    // Use cached selection, lock all inputs except current year
    const cached = localStorage.getItem('lm_active_vintage');
    const currentYear = new Date().getFullYear();
    if (cached && parseInt(cached) !== currentYear) {
      disableAllInputs();
    }
    renderVintagePill({ year: cached || currentYear, state: 'Active' });
    return;
  }

  try {
    const res = await fetch(`/api/airtable?baseId=${BASE_ID}&tableId=${TBL_VINTAGES}&sort[0][field]=Year&sort[0][direction]=desc`);
    const data = await res.json();
    vintageData = (data.records || []).map(r => ({ id: r.id, ...r.fields }));

    const currentYear = new Date().getFullYear();
    const hasActive = vintageData.some(v => v.State === 'Active' && v.Year === currentYear);
    if (!hasActive) {
      await createVintageRecord(currentYear);
      vintageData.unshift({ Year: currentYear, State: 'Active' });
    }

    const cached = parseInt(localStorage.getItem('lm_active_vintage')) || currentYear;
    activeVintage = vintageData.find(v => v.Year === cached) || vintageData.find(v => v.Year === currentYear);
    localStorage.setItem('lm_active_vintage', activeVintage.Year);
    renderVintagePill(activeVintage);
    applyVintageState(activeVintage.State, activeVintage.Year);
  } catch (e) {
    console.warn('Vintage fetch failed', e);
  }
}

async function createVintageRecord(year) {
  await fetch(`/api/airtable?baseId=${BASE_ID}&tableId=${TBL_VINTAGES}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields: { Year: year, State: 'Active' } }] })
  });
}

function renderVintagePill(vintage) {
  document.getElementById('vintageYear').textContent = vintage.Year;
  const dot = document.getElementById('vintageDot');
  dot.className = 'vintage-pill-dot';
  const state = (vintage.State || 'Active').toLowerCase();
  dot.classList.add(state);

  const lockBtn = document.getElementById('vintageLockBtn');
  if (state === 'active') {
    lockBtn.style.display = 'none';
  } else {
    lockBtn.style.display = 'flex';
    lockBtn.textContent = state === 'locked' ? '🔓' : '📋';
    lockBtn.title = state === 'locked' ? 'Unlock vintage' : 'View change log';
  }

  // Render dropdown
  const dropdown = document.getElementById('vintageDropdown');
  dropdown.innerHTML = vintageData.map(v => `
    <div class="vintage-dropdown-item ${v.Year === vintage.Year ? 'selected' : ''}"
         onclick="selectVintage(${v.Year}, event)">
      ${v.Year}
      <span class="vintage-badge ${(v.State||'Active').toLowerCase()}">${v.State || 'Active'}</span>
    </div>
  `).join('');
}

function toggleVintageDropdown(e) {
  e.stopPropagation();
  document.getElementById('vintageDropdown').classList.toggle('open');
}
document.addEventListener('click', () => {
  document.getElementById('vintageDropdown')?.classList.remove('open');
});

function selectVintage(year, e) {
  e.stopPropagation();
  document.getElementById('vintageDropdown').classList.remove('open');
  const selected = vintageData.find(v => v.Year === year);
  if (!selected || selected.Year === activeVintage?.Year) return;
  activeVintage = selected;
  localStorage.setItem('lm_active_vintage', year);
  renderVintagePill(activeVintage);
  applyVintageState(activeVintage.State, activeVintage.Year);
}

function applyVintageState(state, year) {
  // Hide both banners first
  document.getElementById('vintageBannerLocked').classList.remove('visible');
  document.getElementById('vintageBannerFinalized').classList.remove('visible');

  if (state === 'Locked') {
    document.getElementById('bannerYearLocked').textContent = year;
    document.getElementById('vintageBannerLocked').classList.add('visible');
    disableAllInputs();
  } else if (state === 'Finalized') {
    document.getElementById('bannerYearFinalized').textContent = year;
    document.getElementById('vintageBannerFinalized').classList.add('visible');
    disableAllInputs();
    replaceSubmitWithRequestEdit();
  } else {
    enableAllInputs();
  }
}

function disableAllInputs() {
  document.querySelectorAll('input, select, textarea, button[type="submit"], .btn-save')
    .forEach(el => el.disabled = true);
}
function enableAllInputs() {
  document.querySelectorAll('input, select, textarea, button[type="submit"], .btn-save')
    .forEach(el => el.disabled = false);
}
function replaceSubmitWithRequestEdit() {
  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.textContent = 'Request Edit';
    btn.disabled = false;
    btn.onclick = () => alert('Change-log editing available in Financial Dashboard for finalized vintages.');
  });
}

function handleLockToggle() {
  if (!activeVintage || activeVintage.State === 'Active') return;
  if (activeVintage.State === 'Locked') {
    const currentYear = new Date().getFullYear();
    const currentVintage = vintageData.find(v => v.Year === currentYear);
    openVintageModal(
      'Unlock Vintage',
      `Unlocking ${activeVintage.Year} will lock ${currentYear}. Continue?`,
      async () => {
        await updateVintageState(activeVintage.id, 'Active');
        if (currentVintage) await updateVintageState(currentVintage.id, 'Locked');
        activeVintage.State = 'Active';
        if (currentVintage) currentVintage.State = 'Locked';
        renderVintagePill(activeVintage);
        applyVintageState('Active', activeVintage.Year);
        closeVintageModal();
      }
    );
  }
}

async function updateVintageState(recordId, newState) {
  await fetch(`/api/airtable?baseId=${BASE_ID}&tableId=${TBL_VINTAGES}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ id: recordId, fields: { State: newState } }] })
  });
}

function openVintageModal(title, body, onConfirm) {
  document.getElementById('vintageModalTitle').textContent = title;
  document.getElementById('vintageModalBody').textContent = body;
  document.getElementById('vintageModalConfirm').onclick = onConfirm;
  document.getElementById('vintageModalOverlay').classList.add('open');
}
function closeVintageModal() {
  document.getElementById('vintageModalOverlay').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', initVintage);
```

---

## Task 1: Provision Airtable tables

**Note:** This task requires the Airtable MCP tool or manual creation in the Airtable UI. If using the MCP, the base ID is `appJNEHG8sqXmdYGe`.

Create these 5 tables with the fields listed below. After creation, copy the table IDs into the "Airtable Table IDs" section at the top of this plan.

### TBL_VINTAGES
Fields: Year (Number), State (Single select: Active / Locked / Finalized), Harvest Window Start (Date), Harvest Window End (Date), Tons Target (Number), Tons Actual (Number), Finalized At (Date)

### TBL_VINTAGE_CHANGELOG
Fields: Vintage (Link to TBL_VINTAGES), Module (Single select: Finance / Cellar / Sales / Field / Operations), Table Name (Single line text), Record ID (Single line text), Field Name (Single line text), Original Value (Single line text), New Value (Single line text), Changed At (Date), Reason (Long text)

### TBL_INVENTORY
Fields: Item Name (Single line text), Category (Single select: Bottles / Corks / Labels / Capsules / Boxes / Other), Current Stock (Number), Unit (Single select: ea / case / roll / box), Unit Cost Last (Currency), Reorder Threshold (Number), Linked Supplier (Link — leave unlinked for now), Linked SKUs (Link to TBL_SKUS = `tblLOqkPGMsgNvl2g`)

### TBL_LABOR_RATES
Fields: Rate Name (Single line text), Department (Single select: Vineyard / Cellar / Tasting Room / Events / Admin), Hourly Rate (Currency), Burden Multiplier (Number), Fully Burdened Rate (Formula: `{Hourly Rate}*{Burden Multiplier}`), Effective Date (Date), Active (Checkbox)

### TBL_TASKS
Fields: Task Name (Single line text), Department (Single select: Vineyard / Cellar / Tasting Room / Events / Admin), Default Duration hrs (Number), Active (Checkbox)

- [ ] **Step 1: Create all 5 tables** (via Airtable MCP or Airtable UI)
- [ ] **Step 2: Copy table IDs into the "Airtable Table IDs" table at the top of this plan**
- [ ] **Step 3: Note the IDs — they will be hardcoded into each new screen's `<script>` block**

---

## Task 2: Build `vintage-manager.html`

**Files:**
- Create: `vintage-manager.html`

This screen manages vintage year records. Use the standard left-panel + main-area layout from the existing modules.

- [ ] **Step 1: Create the file with full HTML structure**

Use this template structure (fill in CSS, HTML, JS):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vintage Manager — Lifecycle.</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@300;400;500&display=swap" rel="stylesheet" />
  <style>
    /* Design tokens */
    :root {
      --darlington: #ACCAB2; --beeswax: #E9A752; --grenadine: #D44720;
      --latte: #786140; --cream: #F5EFE4; --dark: #1e1710; --white: #ffffff;
    }
    /* [standard resets, body, topbar, left panel, main area CSS] */
    /* [nav drawer CSS from Phase 1 reference] */
    /* [vintage topbar control CSS from this plan's reference] */
  </style>
</head>
<body>
  <!-- Topbar with hamburger, logo, breadcrumb, vintage control -->
  <!-- Vintage banners + modal -->
  <!-- Left panel: create vintage form -->
  <!-- Main area: vintage cards -->
  <!-- Nav drawer -->
  <script>
    const BASE_ID = 'appJNEHG8sqXmdYGe';
    const TBL_VINTAGES = '[TABLE_ID]';
    /* vintage topbar JS from reference */
    /* screen-specific JS */
  </script>
</body>
</html>
```

- [ ] **Step 2: Implement left panel form**

Fields:
- Year (number input, default current year + 1)
- Harvest Window Start (date input)
- Harvest Window End (date input)
- Tons Target (number input)
- Save button → on click:
  1. Find any existing record in `vintageData` with `State === 'Active'` — if one exists, PATCH it to `State: 'Locked'` first
  2. POST the new vintage record with `State: 'Active'`
  3. Reload records and re-render cards

  This ensures only one vintage is Active at any time.

- [ ] **Step 3: Implement main area — vintage cards**

Fetch all TBL_VINTAGES records sorted by Year descending. Render one card per vintage:

```
┌──────────────────────────────────────────────────┐
│  2025                               [🟢 Active]  │
│  Harvest: Sep 15 – Oct 12                        │
│  Tons: 45 target / 47.3 actual                   │
│  Lots: 6                                         │
│                              [Finalize Vintage]  │
└──────────────────────────────────────────────────┘
```

The "Lots: N" count comes from the `Linked Lots` field on the TBL_VINTAGES record (a linked-record field to TBL_LOTS, defined in spec Section 4). Access it as `record.fields['Linked Lots']?.length ?? 0`.

- [ ] **Step 4: Implement Finalize button — two-step confirmation**

Step 1 modal:
> "Finalizing [YEAR] is permanent. All records will be locked against direct edits. Future changes require a change-log entry. Continue?"

Step 2: show a text input. User must type `FINALIZE [YEAR]` exactly. On match: PATCH record State to 'Finalized', re-render cards.

- [ ] **Step 5: Add canonical nav drawer** (active item: `/vintage-manager.html`)

- [ ] **Step 6: Verify in browser**
- Form creates a new vintage record in Airtable
- Cards display correct data
- Finalize two-step works and state updates

- [ ] **Step 7: Commit**

```bash
git add vintage-manager.html
git commit -m "feat: add vintage-manager screen with finalize two-step confirmation"
```

---

## Task 3: Add vintage topbar control to all 14 screens

The vintage topbar control must be added to every screen. After this task, every page will show the vintage pill and respond to vintage state changes.

**Files to modify (all 14):**
`index.html`, `vineyard.html`, `harvest.html`, `cellar.html`, `blending-lab.html`, `skus.html`, `finance.html`, `financial-dashboard.html`, `suppliers.html`, `overhead-opex.html`, `vintage-manager.html`, `inventory.html` *(once built)*, `labor-rates.html` *(once built)*, `task-library.html` *(once built)*

**Note:** Do `inventory.html`, `labor-rates.html`, `task-library.html` as part of Tasks 4, 5, 6 respectively since those files don't exist yet.

For the 11 existing screens:

- [ ] **Step 1: Add vintage CSS to `<style>` block**
Paste the full CSS from "Vintage Topbar Control Reference → CSS" above, just before the closing `</style>` tag.

- [ ] **Step 2: Add vintage control HTML to topbar**
Before inserting, read the topbar section of the file to understand its existing layout (look for elements with `margin-left: auto`, flex spacers, or right-aligned action buttons). Then insert the "Vintage control" HTML block after the breadcrumb/module label and before any right-side action buttons. If a `margin-left: auto` spacer (`flex:1` div or `.topbar-spacer`) already exists, remove it — the vintage control wrapper already handles right-alignment via its own `margin-left: auto`.

- [ ] **Step 3: Add banner and modal HTML**
Paste the banner + modal HTML immediately after the closing `</div>` of the topbar.

- [ ] **Step 4: Add vintage JS to `<script>` block**
Replace `TBL_VINTAGES = 'FILL_IN_AFTER_TASK_1'` with the real table ID from the top of this plan. Paste the full JS block from the reference into each file's `<script>`. Check for variable name conflicts with existing code (e.g. if the file already uses `BASE_ID`, do not re-declare it).

- [ ] **Step 5: Verify on finance.html (representative test)**
Open `finance.html` in browser. Should see vintage pill in topbar showing current year with green dot. Click pill — dropdown shows all vintages. If no vintages exist yet in Airtable (only created in Task 1), it should auto-create a 2026 Active record.

- [ ] **Step 6: Commit**

```bash
git add index.html vineyard.html harvest.html cellar.html blending-lab.html \
        skus.html finance.html financial-dashboard.html suppliers.html \
        overhead-opex.html vintage-manager.html
git commit -m "feat: add vintage topbar control to all screens"
```

---

## Task 4: Build `inventory.html`

**Files:**
- Create: `inventory.html`

Left panel + main area layout. Tracks dry goods and packaging materials.

- [ ] **Step 1: Create file with standard structure** (same scaffold as Task 2)

Constants:
```js
const TBL_INVENTORY = '[TABLE_ID]';  // from Task 1
```

- [ ] **Step 2: Implement left panel — receive shipment form**

Fields: Item Name (text or select from existing items), Category (select: Bottles / Corks / Labels / Capsules / Boxes / Other), Supplier (select — fetch from suppliers Airtable table if it has one, otherwise free text for now), Quantity Received (number), Unit (select: ea / case / roll / box), Unit Cost (currency), Received Date (date, default today).

On save: if item exists → PATCH Current Stock (add received qty) and Unit Cost Last. If new item → POST new record.

- [ ] **Step 3: Implement main area — inventory table**

Columns: Item, Category, Current Stock, Unit, Unit Cost (Last), Reorder Threshold, Supplier, Status.

Rows where Current Stock ≤ Reorder Threshold: amber row highlight + "LOW" badge in Status column.

Filter chips above table: All / Bottles / Corks / Labels / Capsules / Boxes / Other.

- [ ] **Step 4: Add vintage topbar control** (from Task 3 reference, TBL_VINTAGES = real ID)

- [ ] **Step 5: Add canonical nav drawer** (active item: `/inventory.html`)

- [ ] **Step 6: Verify in browser**
- Form saves a new item to Airtable
- Table reloads and shows the new item
- Low-stock flag appears when stock ≤ threshold

- [ ] **Step 7: Commit**

```bash
git add inventory.html
git commit -m "feat: add inventory screen with low-stock flags"
```

---

## Task 5: Build `labor-rates.html`

**Files:**
- Create: `labor-rates.html`

Left panel + main area layout. Defines labor rate categories by department.

- [ ] **Step 1: Create file with standard structure**

Constants:
```js
const TBL_LABOR_RATES = '[TABLE_ID]';  // from Task 1
```

- [ ] **Step 2: Implement left panel — rate form**

Fields: Rate Name (text), Department (select: Vineyard / Cellar / Tasting Room / Events / Admin), Hourly Rate (currency), Burden Multiplier (number, e.g. 1.28 for 28%), Effective Date (date), Active (checkbox, default checked).

Live preview box below fields showing calculated Fully Burdened Rate = Hourly Rate × Burden Multiplier, updates as user types.

On save: POST to TBL_LABOR_RATES.

- [ ] **Step 3: Implement main area — rates by department**

Group records by Department. Within each group, a sub-table: Rate Name, Hourly Rate, Burden %, Fully Burdened Rate, Effective Date, Active. Inactive rows are dimmed (opacity 0.5).

Toggle button in header: "Show Inactive" / "Hide Inactive".

- [ ] **Step 4: Add vintage topbar control + nav drawer** (active: `/labor-rates.html`)

- [ ] **Step 5: Verify in browser**
- Form saves a new rate to Airtable and it appears in the correct department group
- Fully burdened rate preview updates live as Hourly Rate or Burden Multiplier is changed
- Inactive rates are dimmed and hidden by default; "Show Inactive" toggle reveals them

- [ ] **Step 6: Commit**

```bash
git add labor-rates.html
git commit -m "feat: add labor-rates screen grouped by department"
```

---

## Task 6: Build `task-library.html`

**Files:**
- Create: `task-library.html`

Left panel + main area layout. Master list of tasks that populate dropdowns across modules.

- [ ] **Step 1: Create file with standard structure**

Constants:
```js
const TBL_TASKS = '[TABLE_ID]';  // from Task 1
```

- [ ] **Step 2: Implement left panel — task form**

Fields: Task Name (text), Department (select: Vineyard / Cellar / Tasting Room / Events / Admin), Default Duration hrs (number, optional), Active (checkbox, default checked).

On save: POST to TBL_TASKS.

- [ ] **Step 3: Implement main area — tasks by department**

Group by Department. Each group shows a list of tasks. Active tasks shown normally. Inactive tasks dimmed with strikethrough on task name.

Toggle button per group (or global): "Show Inactive".

Click a task → load it into the left panel form for editing. On save → PATCH.

- [ ] **Step 4: Add vintage topbar control + nav drawer** (active: `/task-library.html`)

- [ ] **Step 5: Verify in browser**
- Form saves a new task to Airtable and it appears under the correct department group
- Clicking a task row loads it into the left panel form for editing; saving PATCHes the record
- Inactive tasks show with strikethrough and are hidden by default; toggle reveals them

- [ ] **Step 6: Commit**

```bash
git add task-library.html
git commit -m "feat: add task-library screen with department grouping and edit-in-panel"
```

---

## Task 7: Update Financial Dashboard with change-log integration

**Files:**
- Modify: `financial-dashboard.html`

This task adds the change-log toggle and Select Changes panel described in the spec Section 6.

- [ ] **Step 1: Read `financial-dashboard.html` fully** to understand its existing data model and how it renders numbers.

- [ ] **Step 2: Add change-log fetch logic**

When a Finalized vintage is active, after loading the dashboard data, also fetch TBL_VINTAGE_CHANGELOG filtered by the active vintage ID:

```js
async function fetchChangeLog(vintageId) {
  // Use FIND() to filter by linked-record ID — the = operator does not work for linked fields in Airtable
  const filter = encodeURIComponent(`FIND('${vintageId}', ARRAYJOIN({Vintage}))`);
  const res = await fetch(`/api/airtable?baseId=${BASE_ID}&tableId=${TBL_VINTAGE_CHANGELOG}&filterByFormula=${filter}`);
  const data = await res.json();
  return data.records || [];
}
```

- [ ] **Step 3: Add change-log flag banner**

When changeLog.length > 0 for a Finalized vintage, show a banner inside the main content area:
```
⚠ This vintage has [N] change-log entries. Showing finalized numbers.  [Toggle ▾]
```

- [ ] **Step 4: Add toggle control**

Three-option toggle: **Finalized** | **All Changes** | **Select Changes**

- Finalized: dashboard renders original numbers
- All Changes: dashboard applies all change-log entries on top of finalized numbers
- Select Changes: opens the change-log side panel

- [ ] **Step 5: Build the Select Changes side panel**

A slide-in panel from the right (320px wide, dark background). Groups entries by Module. For fields with one entry: checkbox. For fields with 2+ entries on the same Field Name: collapsed group row with `▶` arrow and count label ("3 changes"), no checkbox. Click arrow to expand; show individual entries each with a checkbox. Radio behavior within a group (selecting one unchecks others in the same group).

On any checkbox change: re-run dashboard calculation using finalized baseline + checked entries.

- [ ] **Step 6: Verify in browser with a finalized vintage**

If no finalized vintage exists yet, test by temporarily setting a vintage's State to 'Finalized' directly in Airtable.

- [ ] **Step 7: Commit**

```bash
git add financial-dashboard.html
git commit -m "feat: add change-log toggle and select-changes panel to financial dashboard"
```

---

## Task 8: Update sw.js and push

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Add new screen filenames to SHELL array in sw.js**

Add:
- `/vintage-manager.html`
- `/inventory.html`
- `/labor-rates.html`
- `/task-library.html`

- [ ] **Step 2: Bump cache version to `lifecycle-v10`**
First verify the current value in `sw.js`. It should be `lifecycle-v9` after Phase 1. If it still shows `lifecycle-v8`, Phase 1's sw.js change was not deployed — confirm Phase 1 is complete before proceeding.

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "fix: bump sw cache to v10, add Phase 2 screens to SHELL"
```

- [ ] **Step 4: Push to main**

```bash
git push origin main
```

- [ ] **Step 5: Smoke test after Vercel deploy**

1. All 14 screens load without 404
2. Vintage pill appears in every screen's topbar
3. Switching vintage updates the banner and disables inputs on Locked vintages
4. `vintage-manager.html` — create a new vintage, confirm it appears in all dropdowns
5. `inventory.html` — receive a shipment, confirm stock updates
6. `labor-rates.html` — add a rate, confirm it appears grouped by department
7. `task-library.html` — add a task, confirm it appears in the correct department group
8. `financial-dashboard.html` — if a finalized vintage exists, confirm change-log toggle appears

Phase 2 complete.
