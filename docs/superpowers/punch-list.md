# Punch List — Deferred Issues

A running list of small bugs, hardening items, and minor improvements that surface during code review but are intentionally deferred from the in-flight work to keep PRs focused. Each entry is self-contained — a future session should be able to pick one up cold and fix it.

When you fix an item, move it to the **Fixed** section at the bottom with a date + commit ref instead of deleting it.

---

## Open

### 1. Pipe character `|` in task/provider/block names corrupts composite keys
**Source:** Code review of Task 4 (commit `af80893`), 2026-05-28
**File:** `vineyard.html`
**What:** Labor log composite keys are built as `${date}|${task}|${blockLabel}|${category}`, and select option values are stored as `${id}|${name}`. The edit panel's dirty check and save read these values back with `.split('|')[1]`. If any name contains a literal `|` (e.g. `"Cover Crop | Mow"`), the split will mis-parse:
- The dirty check will falsely flag an unchanged field as changed.
- The save will write the wrong name into the Airtable diff comparison.
- Row delete keys can also collide silently.
**Risk:** Currently latent — no active task/provider/block name contains `|`. Becomes functional the moment one does.
**Fix path:** Either (a) URL-encode the name half on render and decode on read (`encodeURIComponent`/`decodeURIComponent`), or (b) restructure option values to use `data-id` / `data-name` attributes instead of a packed `value` string. Option (a) is the smaller diff.
**Scope:** Same change needs to apply to the new-entry form's provider/task/block selects too, so the dirty/save reads can rely on a single convention.

---

### 2. `guessDept` fallback silently lands unknown depts on Vineyard
**Source:** Code review of Task 4 (commit `af80893`), 2026-05-28
**File:** `vineyard.html` — `guessDept(taskName)` around line 1137; `inferDeptKeyFromValue` around line 1739
**What:** When a task name isn't found in `TASKS_MAP`, `guessDept` returns the raw Airtable dept string (`|| key` fallback). If that raw string doesn't match any `DEPT_MAP` value, `inferDeptKeyFromValue` falls back to `'Vineyard'`. Result: opening such an entry in the edit panel will incorrectly show the Vineyard pill active, plus the block + harvest fields — even when the entry was logged against a different department.
**Risk:** Latent today (all active tasks should live in `TASKS_MAP`). Surfaces if a task is deleted from the task library while old log records still reference it.
**Fix path:** When `inferDeptKeyFromValue` can't map the display string, prefer the raw `rep.dept` value over `'Vineyard'` for the pill label, or surface an "Unknown" pill state. Alternatively, store a stable dept key on the log row at load time so we don't have to round-trip through display strings.

---

### 3. `closeLogEditPanel` doesn't reset `editLogDept` / `editLogHarvestOn`
**Source:** Code review of Task 4 (commit `af80893`), 2026-05-28
**File:** `vineyard.html` — `closeLogEditPanel` around line 1889
**What:** The close handler resets 4 of 6 state vars (`editLogKey`, `editLogRecordIds`, `editLogOriginal`, `editLogIsSplit`) but leaves `editLogDept` and `editLogHarvestOn` at whatever the last session left them. Harmless in practice — both are overwritten on next open before any render — but the partial reset is a maintenance trap.
**Risk:** Pure code hygiene; no functional impact.
**Fix path:** Add `editLogDept = 'Vineyard';` and `editLogHarvestOn = false;` to the close reset block.

---

### 4. Hardcoded department pill list in `renderLogEditBody`
**Source:** Code review of Task 4 (commit `af80893`), 2026-05-28
**File:** `vineyard.html` — `renderLogEditBody` around line 1756
**What:** The dept pill list is a hard-coded array `['Vineyard','Cellar','Admin','Sales','Events']` instead of being derived from `DEPT_MAP`. If a new department is added to `DEPT_MAP`, the edit panel won't pick it up automatically.
**Risk:** Drift between the create form and the edit panel if departments ever change.
**Fix path:** Replace the hard-coded list with `Object.keys(DEPT_MAP)`. Make sure the new-entry form's dept pill list (around line 583) is also derived from the same source.

---

### 5. No guard when `BLOCKS` is empty in the edit panel
**Source:** Code review of Task 4 (commit `af80893`), 2026-05-28
**File:** `vineyard.html` — `renderLogEditBody` block-select rendering, around line 1773
**What:** If `loadBlocks()` failed during init (`BLOCKS = []`), the edit panel for a Vineyard single-entry will render an empty `<select id="lep-block">`. The save flow will then treat that as "no block selected" and silently omit the block from the diff, even if the original entry had a block.
**Risk:** Low — a `loadBlocks` failure surfaces other errors first. But if it ever happens silently, the edit panel could strip block links from records.
**Fix path:** When `BLOCKS.length === 0` and we're rendering the block field, show a hint message ("Blocks unavailable — reload to retry") and disable the Save button.

---

### 6. Department is derived from task, not stored — edge case in dept switching
**Source:** Code review of Task 6 (commit `7e32142`), 2026-05-28
**File:** `vineyard.html` — `guessDept`, `saveLogEditPanel`
**What:** The log row's `dept` is never stored on the Airtable record; it's derived at load time by looking up the task in `TASKS_MAP` and mapping to `DEPT_MAP`. The edit panel's save flow therefore can't write a `F_LOG_DEPT` value — there isn't one. In practice this is fine: when the user changes the dept pill, `setLogEditDept` forces them to pick a new task from that dept's list, and the task write propagates the dept on next `loadLogs()`. The edge case is if the same task name exists in two depts (e.g. "Cleanup" lives under both Cellar and Admin) — switching the pill but landing on the same task name will silently keep the original dept after reload.
**Risk:** Low — depends on task-name overlap across departments, which is rare in the current task library.
**Fix path:** Either store dept explicitly on the log record (new Airtable field + write on save) or keep relying on task-derived dept and ensure task names are globally unique.

---

### 7. Labor log split-cost storage
**Source:** 2026-05-28 brainstorm during labor-log edit-panel work
**File:** `vineyard.html` — `submitLog`, `loadLogs`, `renderLogs`
**What:** When labor is logged across multiple blocks (e.g. "All Pinot Noir"), each Airtable record stores the full `Workers × Hours` rather than a per-block share. As a result, on page reload the split row reappears as separate rows each showing the full cost, and totals sum incorrectly. Cost-split shares exist only in the JS session that created them.
**Risk:** Real — already misreports costs after reload.
**Fix path:** Write per-block scaled `hours` to each record (Airtable computes total from `workers × hours × rate`, so scaling `hours` propagates to the formula field), or add an explicit `shareFraction` field. Also documented in `CLAUDE.md` Known Issues.

---

## Fixed

*(none yet)*
