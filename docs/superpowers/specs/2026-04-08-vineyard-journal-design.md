# Vineyard Journal — Design Spec

**Date:** 2026-04-08
**Status:** Approved for implementation

---

## Overview

A new screen (`vineyard-journal.html`) added as a third tab in the Vineyard section. Replaces the paper/spreadsheet vineyard log winemakers keep through the growing season. Logs daily weather automatically, calculates powdery mildew (PM) pressure from actual conditions, forecasts PM pressure 7 days out using Open-Meteo, and recommends the optimal spray window before high-pressure days.

---

## Architecture

**New file:** `vineyard-journal.html` — standalone self-contained HTML page, same pattern as all other screens.

**Tab navigation:** `vineyard.html` adds a tab bar below the topbar linking to itself (Blocks), Labor Log, and `vineyard-journal.html`. The Journal page's tab bar mirrors this with the Journal tab active.

**Airtable table:** New `TBL_VINEYARD_LOG` table. All reads/writes go through `/api/airtable`.

**Weather source:** Open-Meteo (`api.open-meteo.com`) — free, no API key, CORS-enabled. Called directly from browser JS.

---

## Airtable Table — TBL_VINEYARD_LOG

| Field | Type | Notes |
|---|---|---|
| Entry Name | singleLineText | Primary — auto-set, e.g. "2026-04-08 Weather" |
| Date | date | Date of entry |
| Type | singleSelect (Weather / Spray / Observation / Milestone) | Entry category |
| Auto Logged | checkbox | True if weather was auto-fetched from Open-Meteo |
| Vintage Year | number | Denormalized for fast filtering |
| Temp High | number | °F daily high |
| Temp Low | number | °F daily low |
| Rain | number | Inches precipitation |
| Wind | number | mph wind speed |
| Weather Code | number | Open-Meteo WMO weather code (for icon) |
| PM Pressure | singleSelect (Low / Medium / High) | Calculated from weather data |
| PM Score | number | 0–100 composite risk score |
| Notes | multilineText | Winemaker observations |
| Spray Product | singleLineText | For Type=Spray |
| Spray Rate | singleLineText | e.g. "6 oz/acre" |
| Spray Method | singleSelect (Tractor Sprayer / Backpack / ATV Sprayer / Drone) | For Type=Spray |
| Spray Target | singleSelect (Powdery Mildew / Botrytis / Downy Mildew / Insects / Nutrition / Other) | For Type=Spray |
| Blocks | multipleRecordLinks → TBL_BLOCKS | Blocks affected (spray or observation) |
| Category | singleSelect (Observation / Decision / Milestone) | Sub-type for non-weather entries |
| Milestone Name | singleSelect (Bud Break / Cane Selection / Bloom / Fruit Set / Veraison / Harvest) | For Type=Milestone |

---

## PM Pressure Algorithm — Gubler-Thomas (Simplified Daily)

Calculated for any day with weather data (past or forecast):

| Condition | Score contribution |
|---|---|
| Daily high ≥ 70°F | +50 |
| Daily low ≥ 50°F | +30 |
| Rain < 0.1" | +20 |
| Rain ≥ 0.1" and < 0.25" | −20 |
| Rain ≥ 0.25" | −50 |
| Daily high > 95°F | −30 (heat stress suppresses PM) |

**Score is clamped to 0–100** (can't go negative). **Thresholds:** 0–39 = Low, 40–69 = Medium, 70–100 = High

This score is stored on each historical log entry. For forecast days it is computed client-side from Open-Meteo forecast data and never stored.

---

## Open-Meteo Integration

**Single endpoint call on page load:**

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=45.2397
  &longitude=-122.8006
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,
          windspeed_10m_max,weathercode
  &timezone=America%2FLos_Angeles
  &forecast_days=7
  &past_days=7
```

Returns 14 days: 7 past actuals + 7 forecast. Coordinates are Champoeg, OR.

**Weather code → icon mapping** (WMO codes): 0 = ☀️, 1–3 = ⛅, 45–48 = 🌫️, 51–67 = 🌧️, 71–77 = 🌨️, 80–82 = 🌦️, 95–99 = ⛈️

---

## Auto Weather Logging

On every page load:
1. Fetch Open-Meteo data (past 7 days + next 7)
2. For each of the past 7 days, check if a `Type=Weather` entry exists in `TBL_VINEYARD_LOG` for that date + current vintage year
3. For any missing days, POST a new entry with all weather fields + calculated PM score
4. All auto-fetched entries get `Auto Logged = true`
5. If an entry already exists for a given date, skip — do not duplicate

This is idempotent: running it multiple times creates at most one weather entry per day.

---

## Spray Recommendation Algorithm

Run after Open-Meteo data is loaded, operating on the 7 forecast days:

1. Calculate PM pressure level for each forecast day
2. Find the first HIGH pressure day at index N (0-indexed)
3. **Best spray window = day N−1** (the last day before high pressure begins)
4. If day N−1 is also HIGH (already in a run), recommend today (day 0) — spray ASAP
5. If no HIGH days in the 7-day forecast: show "Low Risk Week — No spray needed"
6. If spray conditions on the recommended day are poor (rain > 0.1" OR wind > 15 mph), show warning and suggest next viable day

**Recommendation banner text:**
- Normal: "[Day name] — Last good window before [N] high-pressure days starting [date]"
- ASAP: "Spray Today — Already in high-pressure conditions"
- Low risk: "Low Risk Week — Next check [date+7]"

---

## Left Panel

- **Auto Weather Notice** — small card showing last sync time
- **2026 Disease Pressure Summary** — compact card: overall season pressure rating (calculated from ratio of high/med/low days logged), mini dot strip of recent days
- **Season Milestones** — Bud Break, Cane Selection, Bloom, Fruit Set, Veraison, Harvest. Each shows logged date or "Not yet logged" with a Log button. Log button expands an inline form (date + notes). Completed milestones show ✓ in darlington green.
- **Est. Harvest Window** — auto-calculated from Bud Break date + 150–170 days
- **Log Spray Event** button — expands inline spray form (date, product, rate, method, target, blocks, notes). Weather fields auto-fill from the day's logged data.
- **Log Observation** button — expands inline form (category, notes)

---

## Right Panel

### Today's Weather Card
- Icon, condition label, auto-logged badge, PM pressure badge
- Stats row: High / Low / Rain / Wind
- PM risk score bar with numeric score

### 7-Day Spray Forecast Card
- Header: "7-Day Spray Forecast" + "Updated [time]"
- **Best Spray Window banner** — grenadine or spray-purple, recommendation text, "Log Spray →" shortcut button
- **7-day strip** — one column per day:
  - Day name + date
  - Weather icon
  - High / Low temps
  - Rain total
  - PM pressure pill (Low/Med/High — color coded green/amber/red)
  - 🌿 marker on recommended spray target day
  - Dashed purple border on spray target column
- **Legend** — Low / Medium / High / Spray target / Today

### Journal Feed
- Chronological feed of all log entries, newest first
- Filter chips: All / Weather / Spray / Obs
- **Weather entries** — `⚡ Auto` badge, condition title, weather stat row, PM badge
- **Spray entries** — purple tint, product/rate/blocks/method grid
- **Observation/Milestone entries** — standard card with category badge and notes
- Empty state: "No entries yet — weather will auto-log on next page load"

---

## Data Flow

**On page load:**
1. Fetch active vintage from `TBL_VINTAGES` → get vintage year
2. In parallel:
   - Fetch all `TBL_VINEYARD_LOG` entries for this vintage year (maxRecords: 500, sorted date desc)
   - Fetch Open-Meteo 14-day data
3. Run auto-log: POST any missing weather entries for the past 7 days
4. Calculate PM pressure for each of the 7 forecast days
5. Run spray recommendation algorithm → render forecast card
6. Render left panel (milestones from log entries, disease pressure summary)
7. Render right panel (today card, forecast card, journal feed)

**On Log Spray / Log Observation:**
1. Validate required fields
2. POST to `TBL_VINEYARD_LOG`
3. Prepend to feed (optimistic UI)

**On Log Milestone:**
1. POST entry with Type=Milestone + Milestone Name
2. Mark milestone item as done in left panel
3. If milestone = Bud Break, recalculate harvest window estimate

**On delete:**
1. DELETE from `TBL_VINEYARD_LOG`
2. Remove from feed DOM

---

## Vineyard Tab Bar Update

`vineyard.html` adds a dark tab bar below its topbar:
- 🌿 Blocks → `vineyard.html` (active on vineyard.html)
- 📋 Labor Log → `vineyard.html` (internal toggle, same page)
- 📓 Journal → `vineyard-journal.html`

`vineyard-journal.html` has the same tab bar with Journal active.

---

## Service Worker

Bump `sw.js` from `lifecycle-v13` to `lifecycle-v14`. Add `vineyard-journal.html` to SHELL array.

---

## Nav Drawer

Add `vineyard-journal.html` to the Field section of the nav drawer in both `vineyard.html` and `vineyard-journal.html`. Label: "📓 Vineyard Journal".
