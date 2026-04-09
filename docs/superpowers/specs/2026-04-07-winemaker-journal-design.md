# Winemaker Journal — Design Spec

**Date:** 2026-04-07  
**Status:** Approved for implementation

---

## Overview

A new screen (`cellar-journal.html`) added as a third tab in the Cellar section. Replaces the twice-daily paper/spreadsheet fermentation log winemakers keep during primary fermentation through pressing. Each wine lot has its own complete, sequentially numbered log.

---

## Architecture

**New file:** `cellar-journal.html` — standalone self-contained HTML page, same pattern as all other screens.

**Tab navigation:** `cellar.html` adds a tab bar below the topbar linking to itself (Wine Lots), the Vessel Map view, and `cellar-journal.html`. The Journal page's tab bar mirrors this with the Journal tab active.

**Airtable table:** New `TBL_FERMENTATION_LOG` table. All reads/writes go through `/api/airtable`.

---

## Airtable Table — TBL_FERMENTATION_LOG

| Field | Type | Notes |
|---|---|---|
| Entry Name | singleLineText | Primary — auto-set by app, e.g. "26-PN1-P1 #4 AM" |
| Lot | multipleRecordLinks → TBL_LOTS | Which lot this entry belongs to |
| Date | date | Date of the reading |
| AM/PM | singleSelect (AM / PM) | Time of day |
| Entry Time | singleLineText | Clock time logged, e.g. "06:30" |
| Brix | number | °Bx reading |
| pH | number | pH reading |
| Temp | number | °F temperature |
| Nutrient | singleLineText | Addition name, e.g. "Fermaid-O" |
| Amount | number | Quantity of addition |
| Unit | singleSelect (g/hL / g/L / mL/hL / oz) | Unit for addition |
| Notes | multilineText | Winemaker observations |
| Entry Number | number | Sequential entry # within the lot (set by app, 1-indexed) |
| Stage | singleSelect (Primary / MLF / Aging) | Fermentation stage at time of entry |
| Vintage Year | number | Denormalized from lot for fast filtering |

---

## Left Panel — Lot List

- Auto-populated by fetching all lots from `TBL_LOTS` filtered to the active vintage year
- Each card shows:
  - Lot ID + stage badge
  - "Last entry: [Date] · [AM/PM]" label
  - Latest Brix / pH / Temp (from most recent log entry, or lot record if no entries yet)
  - Entry count + stage text
- Clicking a card loads that lot's full log into the right panel
- No "Create Lot" here — lot creation stays in Wine Lots tab

---

## Right Panel

### Lot Header
Accent bar in variety color, lot ID, meta (variety · block · crush date), latest Brix/pH/Temp/entry count.

### Stage Progress Bar
6 stages: Crush → Primary → Press → MLF → Aging → Bottling. Current stage highlighted in grenadine, completed stages in darlington green. Date labels from lot record.

### Entry Station (top of right panel, dark card)
- AM/PM toggle — auto-defaults to AM if before noon, PM otherwise
- Brix / pH / Temp inputs (large, touch-friendly)
- Nutrient/Addition row: name + amount + unit
- Stage selector (Primary / MLF / Aging)
- Notes textarea
- IoT note (future sensor integration)
- "Log Entry" button — writes to Airtable, prepends row to log table

### Fermentation Log Table
Columns: `#` · `Date` · `Time` · `AM/PM` · `Brix` · `pH` · `Temp` · `Nutrient / Notes` · (delete)

- Ordered newest-first (#30 at top → #1 at bottom)
- Row numbers are sequential from 1 (crush day AM entry = #1) up to the latest
- Totals bar: Total Entries · Brix Start · Brix Now · Brix Drop · Latest pH
- Empty state: "No entries yet — log the first reading above"

---

## Data Flow

**On page load:**
1. Fetch active vintage from `TBL_VINTAGES` → get vintage year
2. Fetch all lots from `TBL_LOTS` filtered to that vintage year → populate left panel
3. Auto-select first lot (or last-viewed if stored in localStorage)
4. Fetch fermentation log entries for selected lot from `TBL_FERMENTATION_LOG` filtered by linked lot ID → render log table

**On lot click:**
1. Fetch fermentation log entries for that lot
2. Re-render right panel (header, stage progress, log table)
3. Clear and reset entry station inputs

**On "Log Entry":**
1. Validate at least one of Brix/pH/Temp is filled
2. Compute entry number = max(existing entry numbers for this lot) + 1
3. POST to `TBL_FERMENTATION_LOG` with all fields including linked lot ID
4. Prepend new row to log table (optimistic UI, then refresh count)
5. Update lot card's "last entry" summary

**On delete:**
1. DELETE from `TBL_FERMENTATION_LOG`
2. Remove row from DOM
3. Update totals bar

---

## Cellar Tab Bar Update

`cellar.html` adds a dark tab bar below its topbar (matching the mockup style):
- 🍷 Wine Lots → `cellar.html` (active on cellar.html)
- ⊞ Vessel Map → `#` (stays as internal toggle, not a separate page)
- 📔 Winemaker Journal → `cellar-journal.html`

`cellar-journal.html` has the same tab bar with Journal active.

---

## Service Worker

Bump `sw.js` from `lifecycle-v12` to `lifecycle-v13`. Add `cellar-journal.html` to SHELL array.

---

## Nav Drawer

Add `cellar-journal.html` to the Cellar section of the nav drawer in both `cellar.html` and `cellar-journal.html`. Label: "📔 Winemaker Journal".
