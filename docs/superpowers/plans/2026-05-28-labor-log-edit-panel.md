# Labor Log — Click-to-Edit Slide-Over Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the user to click any row in the Labor Log table to open a slide-over edit panel, edit every field, and save changes to Airtable. Mirrors the existing pattern in `vineyard-journal.html`.

**Architecture:** All changes are in `vineyard.html`. Add CSS for the slide-over panel (`.lep-*` namespace to avoid colliding with the vineyard-journal `.ep-*` classes if anyone ever reuses styles cross-file), add the panel HTML, add JS for open/close/dirty-check/save. The Block field is read-only for "Split" entries (multi-record groups); all other fields are always editable. After save, call `loadLogs()` to refresh from Airtable (the `Total` field is an Airtable formula that depends on workers × hours).

**Tech Stack:** Plain HTML, vanilla JS, CSS, Airtable REST proxy. No tests — verification is manual in the browser, matching the existing vineyard-journal workflow.

**Verification baseline:** Spec file `docs/superpowers/specs/2026-05-28-labor-log-edit-panel-design.md`.

**Spec reference:** This plan implements the design in `docs/superpowers/specs/2026-05-28-labor-log-edit-panel-design.md`. Read it once before starting.

---

## Pre-flight context (read once before starting)

- The labor log table is rendered by `renderLogs()` in `vineyard.html` (around line 1430). Each `.log-row` currently shows columns and a `.log-delete-btn` with an inline `onclick`.
- Logs are loaded by `loadLogs()` (around line 1045). Each entry has shape:
  ```
  { airtableId, date, harvest, category, task, block, blockLabel, workers, hours, total, dept, notes, multi }
  ```
- Multi-block ("Split") entries created in the current session have `multi: true` and share the composite key `${date}|${task}|${blockLabel}|${category}`. After page reload, each underlying record loads as a separate row with `multi: false` and its own per-block `blockLabel` — so split groups only exist in-session. Both cases must work in the edit panel.
- Airtable PATCH wrapper: `airtablePatch(tableId, recordId, fields)`. Field IDs for the logs table are already defined as constants: `T_LOGS`, `F_LOG_DATE`, `F_LOG_HARVEST`, `F_LOG_CATEGORY`, `F_LOG_TASK`, `F_LOG_WORKERS`, `F_LOG_HOURS`, `F_LOG_BLOCKS`, `F_LOG_NOTES`. Linked fields write as arrays of one ID, e.g. `[F_LOG_TASK]: [taskId]`.
- Toast helper: `showToast(msg, isError=false)`.
- Service worker version is bumped in `sw.js` and the change is logged in `CHANGELOG.md` for every deploy.

---

## Task 1: Add CSS for the slide-over panel

**Files:**
- Modify: `vineyard.html` — inside the existing `<style>` block

We mirror the vineyard-journal panel styles using a `.lep-` prefix (Labor Edit Panel) so they don't collide with anything else on this page.

- [ ] **Step 1: Locate the toast CSS block**

Find the line `.toast { position:fixed; bottom:28px; right:28px; ...` (around line 249). Insert the new CSS block immediately **before** the `.toast` rule.

- [ ] **Step 2: Add the CSS**

Insert:

```css
/* ── Labor Log Edit Slide-Over ── */
.lep-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:900;opacity:0;pointer-events:none;transition:opacity 0.2s ease-out;}
.lep-backdrop.open{opacity:1;pointer-events:auto;}
.lep-panel{position:fixed;top:0;right:0;width:420px;max-width:100vw;height:100vh;background:var(--dark);z-index:910;display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.2s ease-out;color:rgba(255,255,255,0.85);}
.lep-panel.open{transform:translateX(0);}
.lep-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.lep-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--cream);}
.lep-close{width:28px;height:28px;border-radius:5px;background:rgba(255,255,255,0.07);border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:14px;}
.lep-close:hover{background:rgba(255,255,255,0.13);color:#fff;}
.lep-body{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px;}
.lep-footer{display:flex;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.lep-cancel{flex:0 0 auto;padding:10px 16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.75);border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;}
.lep-save{flex:1;padding:10px 16px;background:var(--grenadine);border:none;color:#fff;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;}
.lep-save:disabled{opacity:0.55;cursor:default;}
.lep-field{display:flex;flex-direction:column;}
.lep-field-label{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:4px;}
.lep-input,.lep-select,.lep-textarea{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:#fff;border-radius:4px;padding:9px 11px;font-family:'Barlow Condensed',sans-serif;font-size:13px;width:100%;box-sizing:border-box;}
.lep-textarea{min-height:70px;resize:vertical;}
.lep-readonly{background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.55);padding:9px 11px;border:1px dashed rgba(255,255,255,0.10);border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:13px;}
.lep-hint{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;}
.lep-dept-pills{display:flex;flex-wrap:wrap;gap:6px;}
.lep-dept-pill{padding:7px 11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.7);border-radius:18px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.08em;cursor:pointer;}
.lep-dept-pill.active{background:var(--grenadine);color:#fff;border-color:var(--grenadine);}
.lep-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 0;}
.lep-toggle-switch{width:32px;height:18px;background:rgba(255,255,255,0.12);border-radius:9px;position:relative;transition:background 0.15s;}
.lep-toggle-knob{width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left 0.15s;}
.lep-toggle.on .lep-toggle-switch{background:var(--grenadine);}
.lep-toggle.on .lep-toggle-knob{left:16px;}
.lep-toggle-label{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.06em;text-transform:uppercase;}
.log-row{cursor:pointer;}
.log-row:hover{background:rgba(0,0,0,0.02);}
```

The last two rules (`.log-row` hover/cursor) make existing rows feel clickable.

- [ ] **Step 3: Manual check — load `/vineyard.html`, no visual regression**

Reload `/vineyard.html`. Log rows should now show a pointer cursor on hover and a subtle hover state. No layout shifts. (Panel HTML is added in Task 2, so clicking does nothing yet.)

- [ ] **Step 4: Commit**

```bash
git add vineyard.html
git commit -m "feat(vineyard): add CSS for labor-log edit slide-over"
```

---

## Task 2: Add the panel HTML markup

**Files:**
- Modify: `vineyard.html` — inject panel markup just before the `<div class="toast" id="toast"></div>` line (around line 723)

- [ ] **Step 1: Locate the toast div**

Find `<div class="toast" id="toast"></div>` (around line 723). Insert the panel markup immediately **before** that line.

- [ ] **Step 2: Add the panel HTML**

Insert:

```html
<!-- LABOR LOG EDIT SLIDE-OVER -->
<div class="lep-backdrop" id="lep-backdrop" onclick="closeLogEditPanel()"></div>
<aside class="lep-panel" id="lep-panel" aria-hidden="true">
  <div class="lep-header">
    <div class="lep-title" id="lep-title">Edit Labor Entry</div>
    <button class="lep-close" onclick="closeLogEditPanel()" aria-label="Close">✕</button>
  </div>
  <div class="lep-body" id="lep-body"></div>
  <div class="lep-footer">
    <button class="lep-cancel" onclick="closeLogEditPanel()">Cancel</button>
    <button class="lep-save" id="lep-save" onclick="saveLogEditPanel()">Save Changes</button>
  </div>
</aside>
```

- [ ] **Step 3: Manual check — markup is present but hidden**

Reload. Inspect DOM: `#lep-panel` exists, has class `lep-panel` (no `.open`), and is translated off-screen. Page looks unchanged.

- [ ] **Step 4: Commit**

```bash
git add vineyard.html
git commit -m "feat(vineyard): add labor-log edit panel markup"
```

---

## Task 3: Make rows clickable and stub the open handler

**Files:**
- Modify: `vineyard.html` — `renderLogs()` row template (around line 1454) + new function stub in the JS section

- [ ] **Step 1: Modify the row template**

Find the row template inside `renderLogs()`:

```js
body.innerHTML = filtered.map(l => `
  <div class="log-row">
    <div class="log-td muted">${fmtDate(l.date)}</div>
    ...
    <div class="log-td" style="padding-right:0">
      <button class="log-delete-btn" onclick="deleteLog('${l.date}|${l.task}|${l.blockLabel}|${l.category}', this)" title="Delete entry">✕</button>
    </div>
  </div>`).join('');
```

Replace the opening `<div class="log-row">` with a clickable version that carries the same composite key, and add `event.stopPropagation()` to the delete button so the row click doesn't also fire:

```js
body.innerHTML = filtered.map(l => {
  const key = `${l.date}|${l.task}|${l.blockLabel}|${l.category}`;
  return `
  <div class="log-row" onclick="openLogEditPanel('${key}')">
    <div class="log-td muted">${fmtDate(l.date)}</div>
    <div class="log-td">${l.harvest ? '<span class="harvest-dot"></span>':''} ${l.task}</div>
    <div class="log-td bold">${l.blockLabel}${l.multi ? '<span class="multi-tag">Split</span>':''}</div>
    <div class="log-td">${l.workers}</div>
    <div class="log-td">${l.hours}</div>
    <div class="log-td"><span class="dept-tag ${deptClass(l.dept)}">${l.dept.split('/')[0]}</span></div>
    <div class="log-td cost">$${l.displayCost.toFixed(2)}</div>
    <div class="log-td" style="padding-right:0">
      <button class="log-delete-btn" onclick="event.stopPropagation();deleteLog('${key}', this)" title="Delete entry">✕</button>
    </div>
  </div>`;
}).join('');
```

- [ ] **Step 2: Add stub `openLogEditPanel` near the bottom of the `<script>` block**

Find the `showToast` function (around line 1654). Add **above** it:

```js
// ─── Labor Log Edit Slide-Over ─────────────────────────────────────────────
let editLogKey       = null;
let editLogRecordIds = [];
let editLogOriginal  = null;
let editLogIsSplit   = false;
let editLogDept      = 'Vineyard';
let editLogHarvestOn = false;

function openLogEditPanel(key) {
  console.log('openLogEditPanel:', key);
  // Full body implemented in Task 4
}

function closeLogEditPanel() {
  document.getElementById('lep-panel').classList.remove('open');
  document.getElementById('lep-panel').setAttribute('aria-hidden', 'true');
  document.getElementById('lep-backdrop').classList.remove('open');
  document.removeEventListener('keydown', logEditPanelKeydown);
  editLogKey = null;
  editLogRecordIds = [];
  editLogOriginal = null;
  editLogIsSplit = false;
}

function logEditPanelKeydown(e) {
  if (e.key === 'Escape') closeLogEditPanel();
}

function saveLogEditPanel() {
  console.log('saveLogEditPanel: not implemented yet');
}
```

- [ ] **Step 3: Manual check — click logs the key**

Reload. Open the console. Click any log row. Console should log `openLogEditPanel: <date>|<task>|<block>|<category>`. Click the delete ✕ — the confirm dialog should appear (existing behavior), and NO row-click console log should fire (the stopPropagation worked).

- [ ] **Step 4: Commit**

```bash
git add vineyard.html
git commit -m "feat(vineyard): wire log row click to edit panel stub"
```

---

## Task 4: Implement `openLogEditPanel` body — find records, render form, open

**Files:**
- Modify: `vineyard.html` — replace the `openLogEditPanel` stub from Task 3

- [ ] **Step 1: Replace `openLogEditPanel` with the full implementation**

Replace:

```js
function openLogEditPanel(key) {
  console.log('openLogEditPanel:', key);
  // Full body implemented in Task 4
}
```

with:

```js
function openLogEditPanel(key) {
  // Find every log entry matching this composite key.
  const matches = logs.filter(l => `${l.date}|${l.task}|${l.blockLabel}|${l.category}` === key);
  if (!matches.length) return;

  // The representative entry — date/task/category/workers/hours/notes are all identical
  // across split records, so the first match is sufficient for pre-fill.
  const rep = matches[0];

  editLogKey       = key;
  editLogRecordIds = matches.map(m => m.airtableId).filter(Boolean);
  editLogOriginal  = JSON.parse(JSON.stringify(rep));
  editLogIsSplit   = matches.length > 1;
  editLogDept      = inferDeptKeyFromValue(rep.dept);
  editLogHarvestOn = !!rep.harvest;

  document.getElementById('lep-title').textContent = 'Edit Labor Entry';
  renderLogEditBody(rep, matches);

  document.getElementById('lep-panel').classList.add('open');
  document.getElementById('lep-panel').setAttribute('aria-hidden', 'false');
  document.getElementById('lep-backdrop').classList.add('open');

  // Idempotent — remove first to avoid double-binding if open is called twice.
  document.removeEventListener('keydown', logEditPanelKeydown);
  document.addEventListener('keydown', logEditPanelKeydown);
}

// `rep.dept` is the display string (e.g. "Cellar/Productions"). Map back to the short key.
function inferDeptKeyFromValue(deptDisplay) {
  const found = Object.keys(DEPT_MAP).find(k => DEPT_MAP[k] === deptDisplay);
  return found || 'Vineyard';
}

function renderLogEditBody(rep, matches) {
  const body = document.getElementById('lep-body');

  // Provider options — built from RATES (same source as the new-entry form's dropdown).
  const providerOpts = RATES.map(r => {
    const selected = r.name === rep.category ? ' selected' : '';
    return `<option value="${r.id}|${escapeHtmlLep(r.name)}"${selected}>${escapeHtmlLep(r.name)}</option>`;
  }).join('');

  // Department pills.
  const deptKey = editLogDept;
  const deptPills = ['Vineyard','Cellar','Admin','Sales','Events'].map(d =>
    `<button class="lep-dept-pill ${d === deptKey ? 'active' : ''}" onclick="setLogEditDept(this,'${d}')">${d}</button>`
  ).join('');

  // Block field: read-only for split, dropdown for single. For single, we need to find
  // the current block id to pre-select.
  let blockHtml = '';
  const isVineyard = deptKey === 'Vineyard';
  if (isVineyard) {
    if (editLogIsSplit) {
      const blockList = matches.map(m => escapeHtmlLep(m.block)).join(', ');
      blockHtml = `
        <div class="lep-field" id="lep-block-wrap">
          <div class="lep-field-label">Vineyard Block</div>
          <div class="lep-readonly">Split across ${blockList}</div>
          <div class="lep-hint">To change which blocks were worked, delete this entry and re-log.</div>
        </div>`;
    } else {
      const currentBlock = BLOCKS.find(b => b.name === rep.block);
      const blockOpts = BLOCKS.map(b =>
        `<option value="${b.id}|${escapeHtmlLep(b.name)}" ${currentBlock && currentBlock.id === b.id ? 'selected' : ''}>${escapeHtmlLep(b.name)}</option>`
      ).join('');
      blockHtml = `
        <div class="lep-field" id="lep-block-wrap">
          <div class="lep-field-label">Vineyard Block</div>
          <select class="lep-select" id="lep-block">${blockOpts}</select>
        </div>`;
    }
  } else {
    blockHtml = `<div class="lep-field" id="lep-block-wrap" style="display:none"></div>`;
  }

  // Task options — populated based on current department.
  const taskOpts = (TASKS_MAP[deptKey] || []).map(t =>
    `<option value="${t.id}|${escapeHtmlLep(t.name)}" ${t.name === rep.task ? 'selected' : ''}>${escapeHtmlLep(t.name)}</option>`
  ).join('');

  // Harvest toggle — only relevant for Vineyard dept.
  const harvestHtml = `
    <div class="lep-field" id="lep-harvest-wrap" style="display:${isVineyard ? '' : 'none'}">
      <div class="lep-toggle ${editLogHarvestOn ? 'on' : ''}" id="lep-harvest" onclick="toggleLogEditHarvest()">
        <div class="lep-toggle-switch"><div class="lep-toggle-knob"></div></div>
        <div class="lep-toggle-label">Harvest Labor</div>
      </div>
    </div>`;

  body.innerHTML = `
    <div class="lep-field">
      <div class="lep-field-label">Date</div>
      <input type="date" class="lep-input" id="lep-date" value="${rep.date}"/>
    </div>
    <div class="lep-field">
      <div class="lep-field-label">Labor Provider</div>
      <select class="lep-select" id="lep-provider">${providerOpts}</select>
    </div>
    <div class="lep-field">
      <div class="lep-field-label">Department</div>
      <div class="lep-dept-pills">${deptPills}</div>
    </div>
    ${blockHtml}
    <div class="lep-field">
      <div class="lep-field-label">Task</div>
      <select class="lep-select" id="lep-task">${taskOpts}</select>
    </div>
    <div class="lep-field">
      <div class="lep-field-label">Workers</div>
      <input type="number" class="lep-input" id="lep-workers" min="1" value="${rep.workers}"/>
    </div>
    <div class="lep-field">
      <div class="lep-field-label">Hrs / Worker</div>
      <input type="number" class="lep-input" id="lep-hours" min="0.5" step="0.5" value="${rep.hours}"/>
    </div>
    ${harvestHtml}
    <div class="lep-field">
      <div class="lep-field-label">Notes</div>
      <textarea class="lep-textarea" id="lep-notes">${escapeHtmlLep(rep.notes || '')}</textarea>
    </div>
  `;
}

function escapeHtmlLep(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
```

- [ ] **Step 2: Add `setLogEditDept` and `toggleLogEditHarvest` helpers**

Add **directly below** `escapeHtmlLep`:

```js
function setLogEditDept(el, deptKey) {
  editLogDept = deptKey;
  document.querySelectorAll('.lep-dept-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  const isVineyard = deptKey === 'Vineyard';
  document.getElementById('lep-block-wrap').style.display = isVineyard ? '' : 'none';
  document.getElementById('lep-harvest-wrap').style.display = isVineyard ? '' : 'none';

  // Repopulate task dropdown for the new dept.
  const taskSel = document.getElementById('lep-task');
  const currentTask = (taskSel.value || '').split('|')[1] || '';
  taskSel.innerHTML = (TASKS_MAP[deptKey] || []).map(t =>
    `<option value="${t.id}|${escapeHtmlLep(t.name)}" ${t.name === currentTask ? 'selected' : ''}>${escapeHtmlLep(t.name)}</option>`
  ).join('');
}

function toggleLogEditHarvest() {
  editLogHarvestOn = !editLogHarvestOn;
  document.getElementById('lep-harvest').classList.toggle('on', editLogHarvestOn);
}
```

- [ ] **Step 3: Manual check — open panel for various entry types**

Reload `/vineyard.html`. Test scenarios:

1. **Vineyard single entry:** Click a non-Split Vineyard row. Panel opens, all fields pre-filled, Block dropdown visible, Harvest toggle visible. Switch dept pill to "Cellar" — Block + Harvest hide, Task dropdown repopulates with cellar tasks. Switch back to "Vineyard" — Block + Harvest reappear.
2. **Cellar entry:** Click any cellar row. Panel opens, Block + Harvest hidden, Task dropdown shows cellar tasks.
3. **Split entry (in-session):** Log "All Pinot Noir" with 4 workers × 8 hrs. The split row appears with "Split" tag. Click it. Panel opens; Block field shows "Split across Pinot Noir 1, Pinot Noir 2…" as `.lep-readonly` with the hint text. All other fields editable.
4. **Loaded entry (after reload):** Reload the page. Click any row. Panel opens normally (treated as single, since `multi: false` post-reload).

Verify Save button does nothing yet (logs "not implemented"); close via ✕, Cancel, backdrop, or Escape — all should close.

- [ ] **Step 4: Commit**

```bash
git add vineyard.html
git commit -m "feat(vineyard): render labor-log edit form, pre-fill, dept switching"
```

---

## Task 5: Implement dirty check + close confirmation

**Files:**
- Modify: `vineyard.html` — extend `closeLogEditPanel` to confirm if dirty

- [ ] **Step 1: Add `logEditPanelIsDirty` helper**

Add **above** `closeLogEditPanel`:

```js
function logEditPanelIsDirty() {
  if (!editLogOriginal) return false;
  const orig = editLogOriginal;

  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  if (getVal('lep-date') !== orig.date) return true;

  const provName = (getVal('lep-provider').split('|')[1] || '');
  if (provName !== orig.category) return true;

  if (editLogDept !== inferDeptKeyFromValue(orig.dept)) return true;

  // Block — only check for single-block entries.
  if (!editLogIsSplit && editLogDept === 'Vineyard') {
    const blockName = (getVal('lep-block').split('|')[1] || '');
    if (blockName !== orig.block) return true;
  }

  const taskName = (getVal('lep-task').split('|')[1] || '');
  if (taskName !== orig.task) return true;

  if (parseFloat(getVal('lep-workers')) !== orig.workers) return true;
  if (parseFloat(getVal('lep-hours'))   !== orig.hours)   return true;

  if (editLogDept === 'Vineyard' && editLogHarvestOn !== !!orig.harvest) return true;

  if ((getVal('lep-notes') || '').trim() !== (orig.notes || '').trim()) return true;

  return false;
}
```

- [ ] **Step 2: Update `closeLogEditPanel` to check dirty state**

Replace the existing `closeLogEditPanel` with:

```js
function closeLogEditPanel() {
  if (logEditPanelIsDirty()) {
    if (!confirm('Discard unsaved changes?')) return;
  }
  document.getElementById('lep-panel').classList.remove('open');
  document.getElementById('lep-panel').setAttribute('aria-hidden', 'true');
  document.getElementById('lep-backdrop').classList.remove('open');
  document.removeEventListener('keydown', logEditPanelKeydown);
  editLogKey = null;
  editLogRecordIds = [];
  editLogOriginal = null;
  editLogIsSplit = false;
}
```

- [ ] **Step 3: Manual check — dirty check fires correctly**

Reload. Test:

1. Click a row to open panel. Without changing anything, click Cancel — closes without prompt.
2. Click a row, change workers from 4 → 5, click ✕ — `Discard unsaved changes?` prompt appears. Click Cancel — panel stays open with the 5. Click OK — panel closes.
3. Change dept pill to a different dept, then Escape — prompt appears.
4. Toggle harvest, then click backdrop — prompt appears.

- [ ] **Step 4: Commit**

```bash
git add vineyard.html
git commit -m "feat(vineyard): dirty-check confirm on labor-log edit close"
```

---

## Task 6: Implement Save — build diff, validate, PATCH, refresh

**Files:**
- Modify: `vineyard.html` — replace the `saveLogEditPanel` stub

- [ ] **Step 1: Replace `saveLogEditPanel`**

Replace:

```js
function saveLogEditPanel() {
  console.log('saveLogEditPanel: not implemented yet');
}
```

with:

```js
async function saveLogEditPanel() {
  if (!editLogOriginal || !editLogRecordIds.length) return;

  const getVal = id => document.getElementById(id)?.value || '';

  // Pull form values.
  const newDate    = getVal('lep-date');
  const newProvRaw = getVal('lep-provider');           // "id|name"
  const newTaskRaw = getVal('lep-task');               // "id|name"
  const newWorkers = parseFloat(getVal('lep-workers'));
  const newHours   = parseFloat(getVal('lep-hours'));
  const newNotes   = (getVal('lep-notes') || '').trim();
  const newDeptKey = editLogDept;
  const isVineyard = newDeptKey === 'Vineyard';
  const newBlockRaw = isVineyard && !editLogIsSplit ? getVal('lep-block') : '';

  // Required-field validation.
  if (!newDate || !newProvRaw || !newTaskRaw || !newWorkers || !newHours) {
    showToast('Please fill in all required fields.', true);
    return;
  }
  if (isVineyard && !editLogIsSplit && !newBlockRaw) {
    showToast('Block is required for Vineyard entries.', true);
    return;
  }

  const [provId, provName] = newProvRaw.split('|');
  const [taskId, taskName] = newTaskRaw.split('|');
  const [blockId]          = newBlockRaw.split('|');

  // Build diff (Airtable field-id keys, only changed values).
  const orig = editLogOriginal;
  const diff = {};
  if (newDate !== orig.date)                         diff[F_LOG_DATE]    = newDate;
  if (provName !== orig.category)                    diff[F_LOG_CATEGORY] = [provId];
  if (taskName !== orig.task)                        diff[F_LOG_TASK]    = [taskId];
  if (newWorkers !== orig.workers)                   diff[F_LOG_WORKERS] = newWorkers;
  if (newHours   !== orig.hours)                     diff[F_LOG_HOURS]   = newHours;
  if (newNotes !== (orig.notes || ''))               diff[F_LOG_NOTES]   = newNotes;
  // Harvest only applies for Vineyard. If dept changed away from Vineyard, force false.
  const newHarvest = isVineyard ? editLogHarvestOn : false;
  if (newHarvest !== !!orig.harvest)                 diff[F_LOG_HARVEST] = newHarvest;
  // Block — only for single-block entries that stayed (or became) Vineyard.
  if (!editLogIsSplit && isVineyard && blockId) {
    const origBlockId = BLOCKS.find(b => b.name === orig.block)?.id;
    if (blockId !== origBlockId) diff[F_LOG_BLOCKS] = [blockId];
  }

  if (Object.keys(diff).length === 0) {
    closeLogEditPanel();
    return;
  }

  // Disable save button.
  const saveBtn = document.getElementById('lep-save');
  const origLabel = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    // PATCH every Airtable record in the group with the same diff.
    await Promise.all(editLogRecordIds.map(id => airtablePatch(T_LOGS, id, diff)));
    showToast('Entry updated.');
    // Force a re-pull so the Airtable formula Total reflects new workers/hours.
    await loadLogs();
    // Snap dirty check to clean before closing (loadLogs replaces `logs` array).
    editLogOriginal = null;
    closeLogEditPanel();
  } catch (e) {
    console.error(e);
    showToast(e.message || 'Save failed — check proxy.', true);
  } finally {
    // Reset button on both success and failure so the next open shows the right label.
    saveBtn.disabled = false;
    saveBtn.textContent = origLabel;
  }
}
```

- [ ] **Step 2: Manual check — save flow end-to-end**

Reload. Test:

1. **Single Vineyard edit:** Click a Vineyard row. Change Workers from 4 → 5, change Notes. Click Save. Toast says "Entry updated." Panel closes. Row re-renders with workers=5 and the cost updates (since Airtable recomputes Total).
2. **Cellar edit:** Click a Cellar row. Change Hours from 8 → 6. Save. Verify cost halves (8h vs 6h).
3. **Dept change:** Click a Vineyard row, switch to Admin dept, pick an Admin task. Save. Reload. Verify the row's department tag now reads `Admin` and Block became empty in Airtable. (Note: switching out of Vineyard does NOT auto-clear the block link — by design, only changes that differ from `orig` are diffed. If user wants block cleared, they should delete and re-log. This matches the spec's scope.)
4. **Split edit:** Create a fresh "All Pinot Noir" log with 3 workers × 4 hrs. Click the resulting Split row. Change Workers to 4. Save. Verify the Split row updates and that each underlying Airtable record (via the Airtable UI) shows workers=4.
5. **Validation:** Open a row, blank out Workers, click Save → toast error, no PATCH fires.
6. **Save failure:** Temporarily break the proxy URL in DevTools (or disconnect WiFi). Edit something, Save → toast error, panel stays open, Save button re-enabled.

- [ ] **Step 3: Commit**

```bash
git add vineyard.html
git commit -m "feat(vineyard): save labor-log edits — diff PATCH + refresh"
```

---

## Task 7: Bump service worker version

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Find the cache version constant**

Open `sw.js`. Look for a line like `const CACHE_NAME = 'lifecycle-vNN';` or similar.

- [ ] **Step 2: Bump the version**

Increment by one (e.g. `lifecycle-v28` → `lifecycle-v29`).

- [ ] **Step 3: Manual check**

Reload page. Open DevTools → Application → Service Workers — the new version should show as active after one reload cycle.

- [ ] **Step 4: Commit**

```bash
git add sw.js
git commit -m "chore: bump sw cache version"
```

---

## Task 8: Document — Known Issues entry + CHANGELOG

**Files:**
- Modify: `CLAUDE.md` — Known Issues section (around line 355)
- Modify: `CHANGELOG.md` — new version entry at top

- [ ] **Step 1: Add to `CLAUDE.md` Known Issues**

Find the `## Known Issues` heading. Append a new bullet:

```markdown
- **Labor log split-cost storage:** When labor is logged across multiple blocks (e.g. "All Pinot Noir"), each Airtable record stores the full `Workers × Hours` rather than a per-block share. As a result, on page reload the split row reappears as separate rows each showing the full cost, and totals sum incorrectly. Cost-split shares exist only in the JS session that created them. Fix path: write per-block scaled `hours` to each record (or store an explicit `shareFraction` field). Context: 2026-05-28 brainstorm during labor-log edit-panel work.
```

- [ ] **Step 2: Add to `CHANGELOG.md`**

Insert at the top of the changelog (below the intro paragraph, above the current latest entry):

```markdown
## [vNN] — 2026-05-28

**Labor log click-to-edit**

### Added
- **`vineyard.html` Labor Log:** Click any logged labor row to open a slide-over edit panel. All fields editable (date, provider, department, task, workers, hours, harvest toggle, notes). Saves via Airtable PATCH and refreshes the log table. Matches the vineyard-journal edit pattern.
- For **single-block** entries, the Vineyard Block field is editable. For **session-created split entries** (e.g. "All Pinot Noir"), the Block field is read-only with the note: *"To change which blocks were worked, delete this entry and re-log."*

### Known
- See `CLAUDE.md` → Known Issues for the labor log split-cost storage bug surfaced during this work.
```

(Replace `vNN` with the version you bumped to in Task 7.)

- [ ] **Step 3: Manual check — files read clean**

Open both files in the editor. Verify the new entries render correctly in any markdown preview.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: log labor-log edit feature + split-cost known issue"
```

---

## Final Verification Checklist (run all in browser)

- [ ] **Vineyard single-block edit:** Click → change workers → Save → row updates, cost reflects new total.
- [ ] **Cellar/Admin/Sales/Events edit:** Click → change hours + notes → Save → row updates.
- [ ] **Dept change:** Vineyard → Admin and back; Block + Harvest visibility track correctly.
- [ ] **Split row edit (session-created):** Block read-only with helper text; other-field edits PATCH every record in the group.
- [ ] **Loaded row edit (post-reload of a session that previously split):** Each row clickable as single, all fields editable.
- [ ] **Delete unaffected:** ✕ button still deletes without opening the edit panel.
- [ ] **Dirty check:** Modifying then closing (✕ / Cancel / backdrop / Escape) prompts confirm.
- [ ] **No-change save:** Open and Save without edits → panel closes silently, no API call.
- [ ] **Required-field validation:** Blank required field → toast error, no PATCH.
- [ ] **Save failure:** Network error → toast error, panel stays open, Save re-enabled.
- [ ] **Service worker version:** New version active in DevTools after one reload.
