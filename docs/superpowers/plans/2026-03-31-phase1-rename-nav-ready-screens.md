# Phase 1: File Rename, Nav Standardization & Ready Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all existing repo files to lowercase-hyphenated convention, copy in 6 ready-built screens from the design folder, standardize the nav drawer across all 14 screens, and deploy to Vercel.

**Architecture:** No build system. Each module is a self-contained HTML file with embedded `<style>` and `<script>`. Changes are made directly to HTML files. No automated test framework — verification is manual browser checks. Each task ends with a commit.

**Tech Stack:** Vanilla HTML/CSS/JS. Airtable REST API via `/api/airtable.js` Vercel proxy. Git + Vercel for deploy.

**Spec:** `docs/superpowers/specs/2026-03-31-screen-integration-design.md` — read it before starting.

---

## Canonical Nav Drawer Reference

Every screen in this repo must contain exactly this nav drawer. Embed the CSS in the file's `<style>` block, the JS in the `<script>` block, the hamburger button in the topbar, and the drawer HTML just before `</body>`. The only variation per-file is which `<a>` tag gets the `.active` class.

### CSS (add to `<style>` block, at the end)

```css
/* ── Nav Drawer ── */
.nav-toggle {
  width: 32px; height: 32px; border-radius: 6px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; transition: all 0.18s; flex-shrink: 0;
}
.nav-toggle:hover { background: rgba(255,255,255,0.13); color: #fff; }
.nav-toggle.open { background: var(--grenadine); border-color: var(--grenadine); color: #fff; }
.nav-overlay {
  display: none; position: fixed; inset: 0; z-index: 490;
  background: rgba(0,0,0,0.45);
}
.nav-overlay.open { display: block; }
.nav-drawer {
  position: fixed; top: 0; left: -280px; width: 280px; height: 100vh;
  background: var(--dark); z-index: 500;
  display: flex; flex-direction: column;
  transition: left 0.25s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 4px 0 32px rgba(0,0,0,0.4);
}
.nav-drawer.open { left: 0; }
.nav-header {
  height: 58px; display: flex; align-items: center;
  padding: 0 20px; gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
}
.nav-header-logo {
  font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 900;
  color: var(--cream); flex: 1;
}
.nav-header-logo span { color: var(--grenadine); }
.nav-close {
  width: 28px; height: 28px; border-radius: 5px;
  background: rgba(255,255,255,0.07); border: none;
  color: rgba(255,255,255,0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all 0.15s;
}
.nav-close:hover { background: rgba(255,255,255,0.13); color: #fff; }
.nav-section-label {
  font-family: 'Barlow Condensed', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.25); padding: 20px 20px 6px;
}
.nav-section-label:first-of-type { padding-top: 16px; }
.nav-section-label.setup { color: rgba(255,255,255,0.15); }
.nav-setup-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 20px; }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px; cursor: pointer; text-decoration: none;
  border-left: 3px solid transparent; transition: all 0.15s;
}
.nav-item:hover { background: rgba(255,255,255,0.06); border-left-color: rgba(255,255,255,0.15); }
.nav-item.active { background: rgba(233,167,82,0.1); border-left-color: var(--beeswax); }
.nav-item.setup { opacity: 0.7; }
.nav-item.setup:hover { opacity: 1; }
.nav-item-icon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; opacity: 0.75; }
.nav-item.active .nav-item-icon { opacity: 1; }
.nav-item-label {
  font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: rgba(255,255,255,0.5); transition: color 0.15s;
}
.nav-item:hover .nav-item-label { color: rgba(255,255,255,0.85); }
.nav-item.active .nav-item-label { color: var(--beeswax); }
.nav-footer {
  margin-top: auto; padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.07);
  font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.18);
}
```

### JS (add inside `<script>` block)

```js
function openNav() {
  document.getElementById('navDrawer').classList.add('open');
  document.getElementById('navOverlay').classList.add('open');
}
function closeNav() {
  document.getElementById('navDrawer').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('open');
}
```

### Topbar hamburger button (first child inside `.topbar` div)

```html
<button class="nav-toggle" onclick="openNav()" title="Navigation">&#9776;</button>
```

### Topbar logo (must link to `/index.html`)

```html
<a href="/index.html" style="text-decoration:none;">
  <div class="topbar-logo">Lifecycle<span>.</span></div>
</a>
```

Note: existing screens may use `Domaine <span>Mathiot</span>` as the logo text — standardize all to `Lifecycle<span>.</span>`.

### Drawer HTML (paste just before `</body>`)

Replace `[ACTIVE_ITEM]` with the href of the current screen to mark it `.active`.

```html
<div class="nav-overlay" id="navOverlay" onclick="closeNav()"></div>
<div class="nav-drawer" id="navDrawer">
  <div class="nav-header">
    <div class="nav-header-logo">Lifecycle<span>.</span></div>
    <button class="nav-close" onclick="closeNav()">✕</button>
  </div>
  <div class="nav-section-label">Field</div>
  <a class="nav-item" href="/vineyard.html">
    <span class="nav-item-icon">🌿</span>
    <span class="nav-item-label">Vineyard</span>
  </a>
  <a class="nav-item" href="/harvest.html">
    <span class="nav-item-icon">⚖️</span>
    <span class="nav-item-label">Harvest</span>
  </a>
  <a class="nav-item" href="/vintage-manager.html">
    <span class="nav-item-icon">🗓</span>
    <span class="nav-item-label">Vintage Manager</span>
  </a>
  <div class="nav-section-label">Cellar</div>
  <a class="nav-item" href="/cellar.html">
    <span class="nav-item-icon">🍷</span>
    <span class="nav-item-label">Cellar</span>
  </a>
  <a class="nav-item" href="/blending-lab.html">
    <span class="nav-item-icon">🧪</span>
    <span class="nav-item-label">Blending Lab</span>
  </a>
  <div class="nav-section-label">Sales</div>
  <a class="nav-item" href="/skus.html">
    <span class="nav-item-icon">📦</span>
    <span class="nav-item-label">SKUs</span>
  </a>
  <div class="nav-section-label">Operations</div>
  <a class="nav-item" href="/inventory.html">
    <span class="nav-item-icon">🏭</span>
    <span class="nav-item-label">Inventory</span>
  </a>
  <a class="nav-item" href="/suppliers.html">
    <span class="nav-item-icon">🤝</span>
    <span class="nav-item-label">Suppliers</span>
  </a>
  <div class="nav-section-label">Finance</div>
  <a class="nav-item" href="/financial-dashboard.html">
    <span class="nav-item-icon">📊</span>
    <span class="nav-item-label">Financial Dashboard</span>
  </a>
  <a class="nav-item" href="/finance.html">
    <span class="nav-item-icon">📈</span>
    <span class="nav-item-label">Finance</span>
  </a>
  <a class="nav-item" href="/overhead-opex.html">
    <span class="nav-item-icon">💸</span>
    <span class="nav-item-label">Overhead & OpEx</span>
  </a>
  <div class="nav-setup-divider"></div>
  <div class="nav-section-label setup">Setup</div>
  <a class="nav-item setup" href="/labor-rates.html">
    <span class="nav-item-icon">⏱</span>
    <span class="nav-item-label">Labor Rates</span>
  </a>
  <a class="nav-item setup" href="/task-library.html">
    <span class="nav-item-icon">📋</span>
    <span class="nav-item-label">Task Library</span>
  </a>
  <div class="nav-footer">Lifecycle Manager · v1.0</div>
</div>
```

---

## File Map

| Action | Source | Destination |
|---|---|---|
| Copy (new content) | `…/DM/Winery/LifeCycle Manager/HTML/Screens/Vineyard Labor Log Screen/vineyard-labor-log-v3.html` | `vineyard.html` |
| Copy (new content) | `…/DM/Winery/LifeCycle Manager/HTML/Screens/Harvest Events Screen/harvest-events-v2.html` | `harvest.html` |
| Copy (new content) | `…/DM/Winery/LifeCycle Manager/HTML/Screens/Blending Lab Screen/blending-lab.html` | `blending-lab.html` |
| Copy (new) | `…/DM/Winery/LifeCycle Manager/HTML/Screens/Financial Dashboard Screen/financial-dashboard.html` | `financial-dashboard.html` |
| Copy (new) | `…/DM/Winery/LifeCycle Manager/HTML/Screens/Suppliers Screen/suppliers.html` | `suppliers.html` |
| Copy (new) | `…/DM/Winery/LifeCycle Manager/HTML/Screens/Overhead & OpEx Screen/overhead-opex.html` | `overhead-opex.html` |
| Copy (new) | `…/DM/Winery/LifeCycle Manager/HTML/UI_Shell/winery-app.html` | `winery-app.html` |
| Rename | `Cellar_1.6.html` | `cellar.html` |
| Rename | `SKUs_1.4.html` | `skus.html` |
| Rename | `Finance_1.0.html` | `finance.html` |
| Delete | `Vineyard_1.4.html` | — |
| Delete | `Harvest_1.4.html` | — |
| Delete | `BlendingLab_1.3.html` | — |

All paths relative to `/Users/DomaineMathiot/Documents/LifeCycle-Manager/`.

Source base path: `/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/`

---

## Task 1: Copy in replacement screens

**Files:**
- Create: `vineyard.html` (from source)
- Create: `harvest.html` (from source)
- Create: `blending-lab.html` (from source)

- [ ] **Step 1: Copy vineyard replacement**

```bash
cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/Screens/Vineyard Labor Log Screen/vineyard-labor-log-v3.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/vineyard.html
```

- [ ] **Step 2: Copy harvest replacement**

```bash
cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/Screens/Harvest Events Screen/harvest-events-v2.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/harvest.html
```

- [ ] **Step 3: Copy blending lab replacement**

```bash
cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/Screens/Blending Lab Screen/blending-lab.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/blending-lab.html
```

- [ ] **Step 4: Verify files exist**

```bash
ls /Users/DomaineMathiot/Documents/LifeCycle-Manager/vineyard.html \
      /Users/DomaineMathiot/Documents/LifeCycle-Manager/harvest.html \
      /Users/DomaineMathiot/Documents/LifeCycle-Manager/blending-lab.html
```

Expected: all three paths printed, no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git add vineyard.html harvest.html blending-lab.html
git commit -m "feat: add replacement screens for vineyard, harvest, blending lab"
```

---

## Task 2: Rename existing screens

**Files:**
- Rename: `Cellar_1.6.html` → `cellar.html`
- Rename: `SKUs_1.4.html` → `skus.html`
- Rename: `Finance_1.0.html` → `finance.html`
- Delete: `Vineyard_1.4.html`, `Harvest_1.4.html`, `BlendingLab_1.3.html`

- [ ] **Step 1: Rename with git mv (preserves history)**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git mv Cellar_1.6.html cellar.html
git mv SKUs_1.4.html skus.html
git mv Finance_1.0.html finance.html
```

- [ ] **Step 2: Delete old files replaced by new ones**

```bash
git rm Vineyard_1.4.html Harvest_1.4.html BlendingLab_1.3.html
```

- [ ] **Step 3: Verify**

```bash
ls *.html
```

Expected: `index.html`, `vineyard.html`, `harvest.html`, `cellar.html`, `blending-lab.html`, `skus.html`, `finance.html`, plus `login.disabled.html`, `sso-callback.html`. (`financial-dashboard.html`, `suppliers.html`, `overhead-opex.html` are not yet present — they come in Task 3.)
Should NOT see: `Vineyard_1.4.html`, `Harvest_1.4.html`, `Cellar_1.6.html`, `BlendingLab_1.3.html`, `SKUs_1.4.html`, `Finance_1.0.html`.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: rename all modules to lowercase-hyphenated convention"
```

---

## Task 3: Copy in new ready-built screens

**Files:**
- Create: `financial-dashboard.html`
- Create: `suppliers.html`
- Create: `overhead-opex.html`
- Create: `winery-app.html`

- [ ] **Step 1: Copy all four files**

```bash
cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/Screens/Financial Dashboard Screen/financial-dashboard.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/financial-dashboard.html

cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/Screens/Suppliers Screen/suppliers.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/suppliers.html

cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/Screens/Overhead & OpEx Screen/overhead-opex.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/overhead-opex.html

cp "/Users/DomaineMathiot/Documents/DM/Winery/LifeCycle Manager/HTML/UI_Shell/winery-app.html" \
   /Users/DomaineMathiot/Documents/LifeCycle-Manager/winery-app.html
```

- [ ] **Step 2: Verify**

```bash
ls /Users/DomaineMathiot/Documents/LifeCycle-Manager/financial-dashboard.html \
      /Users/DomaineMathiot/Documents/LifeCycle-Manager/suppliers.html \
      /Users/DomaineMathiot/Documents/LifeCycle-Manager/overhead-opex.html \
      /Users/DomaineMathiot/Documents/LifeCycle-Manager/winery-app.html
```

Expected: all four paths printed, no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git add financial-dashboard.html suppliers.html overhead-opex.html winery-app.html
git commit -m "feat: add financial dashboard, suppliers, overhead-opex, winery-app shell"
```

---

## Task 4: Add nav drawer to new/replacement screens

These 6 files were copied in from the design folder and have NO nav drawer. Add the canonical nav drawer to each.

**Files to modify:**
- `vineyard.html` — active item: `/vineyard.html`
- `harvest.html` — active item: `/harvest.html`
- `blending-lab.html` — active item: `/blending-lab.html`
- `financial-dashboard.html` — active item: `/financial-dashboard.html`
- `suppliers.html` — active item: `/suppliers.html`
- `overhead-opex.html` — active item: `/overhead-opex.html`

For each file, do all of the following:

- [ ] **Step 1: Add nav drawer CSS**
Open the file and locate the closing `</style>` tag. Paste the full CSS block from the "Canonical Nav Drawer Reference → CSS" section above, immediately before `</style>`.

- [ ] **Step 2: Add hamburger button to topbar**
Find the topbar `<div>` (the dark header bar). Add `<button class="nav-toggle" onclick="openNav()" title="Navigation">&#9776;</button>` as the **first child** inside the topbar div. Then check the logo element: if it already wraps an `<a>` but the href is anything other than `/index.html`, update the href. If it does not wrap an `<a>` at all, wrap it: `<a href="/index.html" style="text-decoration:none;"><div class="topbar-logo">Lifecycle<span>.</span></div></a>`. Also standardize the logo text to `Lifecycle<span>.</span>` (replacing any `Domaine <span>Mathiot</span>` variants).

- [ ] **Step 3: Add JS functions**
Find the `<script>` block. If none exists, create one before `</body>`. Add the `openNav()` and `closeNav()` functions from the Canonical Nav Drawer Reference above. Check they don't already exist to avoid duplicates.

- [ ] **Step 4: Add drawer HTML**
Paste the full drawer HTML from the Canonical Nav Drawer Reference above, immediately before `</body>`. Then add `.active` to the correct nav item for this screen (the `<a>` tag whose `href` matches this file's URL).

- [ ] **Step 5: Verify in browser**
Open each file. Click the hamburger button — drawer should slide in from the left. Click each nav link mentally to confirm it points to the correct URL. Close with ✕ or by clicking the overlay.

- [ ] **Step 6: Commit**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git add vineyard.html harvest.html blending-lab.html \
        financial-dashboard.html suppliers.html overhead-opex.html
git commit -m "feat: add canonical nav drawer to all new and replacement screens"
```

---

## Task 5: Update nav drawer on existing screens

These 4 files already have a nav drawer but it points to old filenames and is missing new screens. Replace the entire drawer HTML with the canonical version.

**Files to modify:**
- `index.html` — this is the dashboard; no nav item should be `.active`
- `cellar.html` — active item: `/cellar.html`
- `skus.html` — active item: `/skus.html`
- `finance.html` — active item: `/finance.html`

For each file:

- [ ] **Step 1: Update nav drawer CSS**
The existing nav drawer CSS uses older class names and is missing `.setup`, `.nav-setup-divider`. Find the existing nav drawer CSS block (search for `.nav-drawer`) and replace the entire block — from `.nav-toggle {` through the closing `}` of `.nav-footer` — with the canonical CSS from the reference above.

- [ ] **Step 2: Replace drawer HTML**
Find the existing `<div class="nav-overlay"...>` and `<div class="nav-drawer"...>` blocks. Delete them both. Paste the canonical drawer HTML immediately before `</body>`. Add `.active` to the correct nav item.

- [ ] **Step 3: Verify topbar logo links to `/index.html`**
The logo should be `<a href="/index.html" ...>`. On `index.html` the logo can stay non-linked or link to itself — either is fine.

- [ ] **Step 4: Verify in browser**
Open each file. Hamburger opens drawer. All links present. Correct item highlighted in beeswax.

- [ ] **Step 5: Commit**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git add index.html cellar.html skus.html finance.html
git commit -m "fix: update nav drawer on existing screens to new URLs and full item list"
```

---

## Task 6: Update sw.js and index.html

**Files:**
- Modify: `sw.js`
- Modify: `index.html`

### sw.js

- [ ] **Step 1: Open `sw.js` and find the cache name**

Current value: `lifecycle-v8`

- [ ] **Step 2: Bump cache version**

Change `lifecycle-v8` to `lifecycle-v9`.

- [ ] **Step 3: Update the SHELL array**

The SHELL array lists cached files. Replace all old filenames with new ones:

Remove (old names):
- `/Vineyard_1.4.html`
- `/Harvest_1.4.html`
- `/Cellar_1.6.html`
- `/BlendingLab_1.3.html`
- `/SKUs_1.4.html`
- `/Finance_1.0.html`

Add (new names):
- `/vineyard.html`
- `/harvest.html`
- `/cellar.html`
- `/blending-lab.html`
- `/skus.html`
- `/finance.html`
- `/financial-dashboard.html`
- `/suppliers.html`
- `/overhead-opex.html`

Do NOT add `vintage-manager.html`, `inventory.html`, `labor-rates.html`, `task-library.html` — those come in Phase 2.

### index.html

- [ ] **Step 4: Open `index.html` and find all nav card links**

Search for the old filenames (`Vineyard_1.4.html`, `Harvest_1.4.html`, etc.) and update every `href` to the new lowercase-hyphenated name. Also add dashboard cards for these three new screens: `financial-dashboard.html`, `suppliers.html`, `overhead-opex.html`. Do NOT add a card for `winery-app.html` — it is a reference shell only, per the spec.

- [ ] **Step 5: Commit**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git add sw.js index.html
git commit -m "fix: bump sw cache to v9, update SHELL array and dashboard links to new filenames"
```

---

## Task 7: Push and verify Vercel deploy

- [ ] **Step 1: Push to main**

```bash
cd /Users/DomaineMathiot/Documents/LifeCycle-Manager
git push origin main
```

- [ ] **Step 2: Check Vercel deploy**

Watch the Vercel dashboard or run:

```bash
gh run list --limit 3
```

Wait for deploy to complete (usually 30–60 seconds).

- [ ] **Step 3: Smoke test in browser**

Open the production URL and verify:
1. Dashboard (`/`) loads with updated nav cards
2. Click Vineyard → loads new redesigned screen
3. Click Harvest → loads new redesigned screen
4. Click Cellar → loads at `/cellar.html` (not 404)
5. Click Finance → loads at `/finance.html`
6. Open hamburger on any screen — all 13 nav items present
7. Click a Setup item (Labor Rates) → expected 404 (Phase 2 not built yet — this is OK)
8. Hard refresh a screen — service worker serves from `lifecycle-v9` cache (check DevTools → Application → Cache Storage)

Phase 1 complete. Proceed to Phase 2 plan.
