# Financial Dashboard — Design Spec
**Date:** 2026-03-23
**Project:** LifeCycle Manager — Domaine Mathiot
**Status:** Approved

---

## Overview

A financial reporting layer across the LifeCycle Manager app. Provides per-module cost breakdowns for operational context, a standalone Finance module that aggregates all data into the three core accounting documents, and export capabilities for sharing with bookkeepers, business partners, and investors.

---

## Goals

- Surface cost data in context within each operational module
- Aggregate all costs and revenue into a shareable Finance module
- Generate Income Statement (P&L), Balance Sheet, and Cash Flow Statement
- Support period filtering by vintage year and calendar year
- Export to CSV and PDF
- Guard against double counting at every level

---

## Audience

Primary: winery owner/winemaker (daily operations)
Secondary: bookkeeper, business partner, investor (periodic review — shared via export or direct URL)

---

## Prerequisites: Airtable Schema Changes

Before any implementation, the following Airtable field issues must be resolved. These are pre-existing conflicts and missing fields that the financial system depends on.

### 1. Lot Cost Field — Missing / Conflicting

`fldEeGD6o6zxIV3gb` is currently mapped as `F_LOT_VOL` (gallons in) in `Cellar_1.6.html`, as `F_L_COST` (cost) in `BlendingLab_1.3.html`, **and** as `F_LOT_COST` (Total Loaded Cost) in `SKUs_1.4.html`. All three cannot be correct — this single field ID is used for three different purposes across three modules.

**Resolution required before implementation:**
- Confirm the true purpose of `fldEeGD6o6zxIV3gb` in Airtable (open Airtable → Wine Lots table → check the field name)
- Identify or create a dedicated **Total Loaded Cost** field in the Wine Lots table
- Document the correct field ID as `F_LOT_COST` and update all three modules that reference it (Cellar, BlendingLab, SKUs)
- Cellar currently reads no cost field from Airtable (`cost: 0` is hardcoded at line 689) — this must be fixed so Cellar reads and writes the correct field

### 2. cost_per_gal Field — Formula vs. Stored Number

`fldjadcAeYVr0XdPk` is read by both BlendingLab (`F_L_CPG`) and SKUs (`F_LOT_CPG`) as cost-per-gallon. This is likely an Airtable formula field (`Total Loaded Cost / Gallons In`). The blending cost transfer model requires that when `Total Loaded Cost` is patched on a source lot, `cost_per_gal` recalculates automatically.

**Confirm before implementation:** Verify that `fldjadcAeYVr0XdPk` is an Airtable formula field defined as `{Total Loaded Cost} / {Gallons In}`. If it is a stored number, the commit logic must also patch it explicitly.

### 4. Harvest Pick Event Cost — Not Written to Airtable

`ef-cost` (total pick cost) is captured in the Harvest event form and stored in-memory but is **never written to Airtable**. The `submitLog()` function's `airtableCreate` call does not include the cost field. `F_EV_CPT` (Cost Per Ton, `fld2ohbBe49Wh1eaa`) is a formula field that likely depends on a base cost field — confirm which Airtable field it references.

**Resolution required before implementation:**
- Confirm or create a **Total Harvest Cost** field in the Pick Events table; document its field ID as `F_EV_COST`
- Update `submitLog()` in `Harvest_1.4.html` to write `F_EV_COST` on event creation
- Confirm `F_EV_CPT` formula references `{Total Harvest Cost}` — if so, it will auto-calculate once the field is populated

### 5. Blend Cost Field — Not Written on Commit

`commitBlend()` in `BlendingLab_1.3.html` currently creates a new Wine Lot with only `Lot ID`, `Stage`, and a recipe link. It does not write the blend's inherited cost or reduce source lot costs.

**This must be corrected as part of this build.** See Blending Cost Distribution section for the required PATCH operations.

---

## Cost Ownership Model

Each cost belongs to exactly one module. No module reads or re-sums costs owned by another module. The Finance dashboard is the only place that aggregates across modules, and it does so as clearly labeled line items by phase.

```
Vineyard Operations  →  Harvest  →  Cellar  →  BlendingLab  →  SKUs
(farm labor, sprays,    (pick labor,  (barrels,    (inherited +    (bottle, cork,
 equipment)             hauling)      additions,    direct costs)   label, capsule,
                                      cellar labor)                 packaging labor)
```

Arrows represent the physical flow of wine through production — they are not cost categories. Vineyard costs stop when fruit is delivered; Harvest costs begin at pick.

### Cost Phase Definitions

| Phase | Module | What It Includes |
|-------|--------|-----------------|
| Vineyard Operations | Vineyard | Farm labor (pruning, canopy, irrigation), sprays, equipment — all pre-harvest costs |
| Harvest | Harvest | Pick labor, hauling — costs to bring fruit in, tied to a specific pick event |
| Cellar | Cellar | Winemaking labor, barrels, additions, lab fees, storage — tied to a specific lot |
| Blending | BlendingLab | Inherited costs from component lots (proportional by volume) + direct costs added to the blend (additives, nutrients, enhancers) |
| Packaging/Sales | SKUs | Bottle, cork, label, capsule, packaging labor — post-production only |

---

## Blending Cost Distribution

Blending is always partial. A typical blend pulls 100% of one lot and 25–50% of others.

### Inherited Cost Calculation

When a blend is committed, `commitBlend()` must perform the following operations:

1. For each component lot, retrieve `total_cost` (F_LOT_COST) and `current_volume` (F_LOT_VOL)
2. `cost_per_gal = total_cost ÷ current_volume`
3. `cost_transferred = gallons_pulled × cost_per_gal` (per component)
4. New blend lot `total_cost` = sum of all `cost_transferred` values
5. **PATCH each source lot** in Airtable: `remaining_cost = original_cost − cost_transferred`, `remaining_volume = original_volume − gallons_pulled`
6. `cost_per_gal` on the source lot remains constant because cost and volume reduce proportionally
7. **PATCH / CREATE the new blend lot** in Airtable with `total_cost` and `volume` written at commit time

If `current_volume` is 0 on a source lot, skip cost transfer for that lot and log a warning.

### Direct Costs on Blend Lots

After a blend is created, direct costs (additives, nutrients, color enhancers, fining agents) may be added to the blend lot itself via a new entry form in BlendingLab. These are new cost entries owned by the blend lot — they did not exist in any source lot and are not double-counted with prior treatments applied to source lots before blending.

Direct costs are stored as line items in a new Airtable table `TBL_BLEND_COSTS` and summed into the lot's `total_cost` field on save.

**`TBL_BLEND_COSTS` schema:**

| Field | Type | Notes |
|-------|------|-------|
| Description | Text | e.g., "Tartaric acid addition", "Bentonite fining" |
| Amount | Number | Dollar cost |
| Date | Date | Date of addition |
| Vintage Year | Number | Inherited from the linked blend lot's vintage year |
| Calendar Year | Number | Derived from Date field |
| Lot | Linked record | Link to Wine Lots record (the blend lot) |
| Notes | Long text | Optional |

**Example:**
- Lot A (300 gal, $8,000 total): received a nutrient treatment pre-blend at $150
- Lot B (300 gal, $6,000 total): no prior treatment
- Blend: 33.33% Lot A (100 gal, $2,667 transferred) + 33.33% Lot B (100 gal, $2,000 transferred)
- Blend inherits: $4,667
- New nutrient added to blend: $200 direct cost entry
- Blend total cost basis: $4,867
- Lot A retains: $5,333 (200 gal, 33.33% pulled → 66.67% remains, $8,000 × 0.6667 = $5,333)

The $150 nutrient cost on Lot A transferred proportionally: $150 × 0.3333 = $50 moved to the blend, $100 remains with Lot A. This is handled automatically by the `cost_transferred` formula — no special handling needed for prior treatments.

### Vintage Year Assignment for Blend Lots

When a blend pulls from components of different vintage years, the new blend lot is assigned the vintage year of the **majority component by volume**. In the case of a tie, the most recent vintage year is used. The winemaker may override this manually on the blend commit form.

---

## "Active" Lot Definition

For Balance Sheet inventory purposes, a lot is **active** if its `current_volume > 0` and its `Stage` is not `Bottled` or `Disposed`. Lots with 0 remaining volume after a full blend pull are excluded from inventory valuation. This prevents retired lots from inflating the asset value.

---

## Per-Module Cost Sections

Each module gets a **Costs** section added to its UI showing only the costs that module owns. Costs are always entered in their home module — never in Finance.

### Vineyard
- Farm operations by block: labor logs (workers × hours × rate), sprays, equipment
- Subtotals by block and by activity type
- Existing labor log form already captures workers, hours, rate — cost is derived

### Harvest
- Pick costs per event: labor, hauling
- Tied to the pick event record (existing `ef-cost` field)
- Derived stat: cost-per-ton = total cost ÷ net tonnage, shown for each event

### Cellar
- Winemaking costs per lot: barrels, additions, lab fees, cellar labor
- Running cost-per-gallon displayed live as costs are added (reads from corrected F_LOT_COST field)
- Lot cost field extended to support line-item breakdown (name, amount, date per entry)

### BlendingLab
Two sub-sections:
1. **Inherited** — shows component lots, gallons pulled, and cost transferred from each (read-only, calculated and written at commit time)
2. **Direct** — entry form for additives/nutrients/enhancers added after the blend is created (name, amount, cost). Stored in `TBL_BLEND_COSTS`, summed into lot's `total_cost`.

Total cost basis displayed = inherited + direct.

### SKUs
- Packaging costs per SKU: bottle, cork, label, capsule, other
- Wine cost auto-populated from linked lot's `cost_per_gal × bottle_volume_ml / 3785.41`
- Margin and MSRP already exist — no change needed
- Channel allocations updated (see below)

---

## Revenue Source

Revenue figures in the P&L are derived from SKU channel allocations: for each SKU, each channel record contains `bottles` (allocated) and `price` (per bottle). Revenue per channel = `Σ(bottles × price)` across all SKUs for that channel. This data is read from Airtable at Finance load time using the existing `TBL_SKUS` table.

**Note:** SKU channel data is stored as a nested JSON string in Airtable. The Finance module must parse and aggregate it using the same approach as `SKUs_1.4.html`.

---

## Sales Channels

Current SKUs channels (`Wine Club`, `Wholesale`, `Restaurant`, `DTC / Tasting Room`) are updated to:

| Channel |
|---------|
| Wine Club |
| Events |
| Weddings |
| DTC |
| Wholesale |

`Restaurant` is split into `Events` and `Weddings`. `DTC / Tasting Room` is simplified to `DTC`.

### Channel Migration

Existing SKU records in Airtable store channel names as strings. When `SKUs_1.4.html` is updated:
- On load, any channel named `Restaurant` is automatically renamed to `Events`
- Any channel named `DTC / Tasting Room` is automatically renamed to `DTC`
- This migration runs in-memory on load and is written back to Airtable via PATCH on next save of that SKU
- Unrecognized channel names are rendered with a warning indicator in the UI rather than silently dropped

---

## Finance_1.0.html Module

A new standalone module following the standard layout: 58px dark topbar, 380px dark left panel, fluid cream main area.

### Airtable: New Table `TBL_FINANCIALS`

Stores manual balance sheet and cash flow entries. Fields:

| Field | Type | Notes |
|-------|------|-------|
| Entry Name | Text | e.g., "Main Checking", "2022 Tractor" |
| Category | Single select | Cash, Fixed Asset, Loan, Loan Repayment, Accounts Receivable, Accounts Payable, Operating Expense, Working Capital Adjustment, Beginning Cash Balance |
| Amount | Number | Dollar value — positive for assets/income, negative for liabilities/expenses where applicable |
| Date | Date | Entry date |
| Vintage Year | Number | e.g., 2026 — for vintage period filtering |
| Calendar Year | Number | e.g., 2026 — for calendar period filtering |
| Notes | Long text | Optional context |

**Loan Repayments** use Category = `Loan Repayment` with a positive Amount. On the Cash Flow Statement, Loan Repayments are displayed as a cash outflow (subtracted). Loan Proceeds use Category = `Loan` with a positive Amount (cash inflow). Sign convention is handled by the Finance module based on category — users always enter positive amounts.

**Beginning Cash Balance** uses Category = `Beginning Cash Balance`. Only one record per period is expected. The Finance module reads the most recent record of this category for the selected period.

### Topbar

- Period toggle: **Vintage Year / Calendar Year**
- Year selector dropdown (populated from available data in all tables)
- **Export CSV** button — downloads all three documents. Each tab also has its own per-tab export button.
- **Print / PDF** button — triggers `window.print()` with print stylesheet
- Navigation links to each module (Vineyard, Harvest, Cellar, BlendingLab, SKUs)

### Left Panel — Manual Balance Sheet Inputs

Entry form for `TBL_FINANCIALS` records:
- Entry Name
- Category (dropdown)
- Amount
- Date
- Vintage Year (auto-populated from period selector, editable)
- Calendar Year (auto-populated, editable)
- Notes

List of recent manual entries below the form with edit/delete.

### Main Area — Four Tabs

#### Tab 1: Overview
Macro financial health at a glance:
- Total Revenue
- Total COGS
- Gross Margin %
- Net Income
- Cash Position

Sales breakdown by channel (Wine Club, Events, Weddings, DTC, Wholesale): table showing bottles allocated, revenue per channel, and % of total. Simple proportional bar visualization using design system colors (`--grenadine`, `--beeswax`, `--darlington`, `--latte`, `--dark`).

Navigation tiles linking to each operational module.

#### Tab 2: P&L (Income Statement)

Inherited blending costs are **not** a separate line. The Cellar COGS line sums `total_cost` across **all** active Wine Lots records — including blend lots. When `commitBlend()` transfers cost from source lots to the new blend lot, the blend lot's `total_cost` becomes part of the Cellar COGS aggregate. Source lot costs are reduced by the exact amount transferred, so the total across all lots is unchanged. Only direct costs added in BlendingLab after the blend is created appear as a separate line (`Blending Direct`).

```
Revenue
  Wine Club          $X    ← SKU channels × bottles × price
  Events             $X
  Weddings           $X
  DTC                $X
  Wholesale          $X
  ─────────────────────
  Total Revenue      $X

Cost of Goods Sold
  Vineyard Operations  $X  ← Vineyard labor logs + farm costs
  Harvest              $X  ← Pick event costs
  Cellar               $X  ← Lot costs (includes cost basis transferred to blends)
  Blending Direct      $X  ← Direct costs added in BlendingLab only
  Packaging            $X  ← SKU packaging costs
  ─────────────────────
  Total COGS           $X

Gross Profit           $X  (XX%)

Operating Expenses     $X  ← TBL_FINANCIALS, Category = Operating Expense

Net Income             $X
```

#### Tab 3: Balance Sheet

"Active" lots = Stage not Bottled/Disposed and volume > 0.

```
Assets
  Current Assets
    Cash & Bank          $X  ← TBL_FINANCIALS, Category = Cash
    Accounts Receivable  $X  ← TBL_FINANCIALS, Category = Accounts Receivable
    Inventory (at cost)  $X  ← Σ(active lot total_cost)
  Fixed Assets           $X  ← TBL_FINANCIALS, Category = Fixed Asset
  ─────────────────────────
  Total Assets           $X

Liabilities
  Accounts Payable       $X  ← TBL_FINANCIALS, Category = Accounts Payable
  Loans                  $X  ← TBL_FINANCIALS, Category = Loan (net of repayments)
  ─────────────────────────
  Total Liabilities      $X

Equity
  Total Equity           $X  ← Total Assets − Total Liabilities (derived)
```

#### Tab 4: Cash Flow Statement

```
Operating Activities
  Net Income                          $X  ← from P&L
  Working Capital Adjustments         $X  ← TBL_FINANCIALS, Category = Working Capital Adjustment
  ──────────────────────────────────────
  Net Cash from Operations            $X

Investing Activities
  Fixed Asset Purchases               $X  ← TBL_FINANCIALS, Category = Fixed Asset
  ──────────────────────────────────────
  Net Cash from Investing             $X

Financing Activities
  Loan Proceeds                       $X  ← TBL_FINANCIALS, Category = Loan
  Loan Repayments                    ($X) ← TBL_FINANCIALS, Category = Loan Repayment
  ──────────────────────────────────────
  Net Cash from Financing             $X

Net Change in Cash                    $X
Beginning Cash Balance                $X  ← TBL_FINANCIALS, Category = Beginning Cash Balance
Ending Cash Balance                   $X
```

---

## Export

### CSV
One file per document. Filename format:
- `domaine-mathiot-pl-2026-vintage.csv`
- `domaine-mathiot-balance-sheet-2026-vintage.csv`
- `domaine-mathiot-cashflow-2026-vintage.csv`

The topbar **Export CSV** button downloads all three. Each tab also has its own individual CSV export button. Labeled rows, numeric values only in value columns.

### PDF
Uses `window.print()` with `@media print` stylesheet. Print view:
- Hides topbar, left panel, navigation elements
- Outputs active tab document only in clean single-column layout
- Includes Domaine Mathiot header, period label (e.g., "2026 Vintage Year"), and generation date
- No external PDF library required
- When the Overview tab is active, Print/PDF outputs all three accounting documents (P&L, Balance Sheet, Cash Flow) sequentially with page breaks between them

---

## Implementation Scope

### Prerequisites (must happen first in Airtable)
1. Resolve the `fldEeGD6o6zxIV3gb` field conflict across Cellar, BlendingLab, and SKUs — confirm its true purpose in Airtable (volume or cost)
2. Confirm or create a **Total Loaded Cost** field in Wine Lots table; document its field ID as `F_LOT_COST` for use in all three modules
3. Confirm `fldjadcAeYVr0XdPk` is an Airtable formula field (`{Total Loaded Cost} / {Gallons In}`)
4. Confirm or create a **Total Harvest Cost** field in Pick Events table; document its field ID as `F_EV_COST`
5. Confirm `fld2ohbBe49Wh1eaa` (`F_EV_CPT`, Cost Per Ton) formula references `{Total Harvest Cost} / {Net Tons}`
6. Create `TBL_FINANCIALS` table in Airtable with fields defined above
7. Create `TBL_BLEND_COSTS` table with fields defined above

### New file
- `Finance_1.0.html` — standalone Finance module

### Modified files
- `Vineyard_1.4.html` — add Costs section to left panel
- `Harvest_1.4.html` — update `submitLog()` to write `F_EV_COST` to Airtable; surface pick cost per event; add cost-per-ton derived stat
- `Cellar_1.6.html` — fix F_LOT_COST field mapping; extend lot cost to support line-item breakdown; display cost-per-gal live
- `BlendingLab_1.3.html` — update `commitBlend()` to write inherited costs and PATCH source lots; add direct cost entry form; resolve F_L_COST field conflict
- `SKUs_1.4.html` — update channel list; add migration for old channel names
- `sw.js` — add Finance_1.0.html to pre-cache shell; bump cache version to `lifecycle-v7` (current is `lifecycle-v6`)
- `index.html` — add Finance navigation card

### New Airtable tables
- `TBL_FINANCIALS` — manual balance sheet and cash flow entries
- `TBL_BLEND_COSTS` — direct cost line items on blend lots

---

## Period Filtering

The Finance module period selector (Vintage Year / Calendar Year) applies to all data sources as follows:

| Source | Vintage Year Filter | Calendar Year Filter |
|--------|-------------------|---------------------|
| Vineyard labor logs | Filter by `F_BL_YEAR` on linked block, or by log date year if available | Filter by log date year |
| Pick events (`TBL_EVENTS`) | Filter by `F_EV_DATE` year (harvest year maps to vintage year for wine) | Filter by `F_EV_DATE` year |
| Wine lots (`TBL_LOTS`) | Filter by `F_LOT_YEAR` (harvest/vintage year field) | Filter by lot creation date year |
| Blend direct costs (`TBL_BLEND_COSTS`) | Filter by `Vintage Year` field | Filter by `Calendar Year` field (derived from Date) |
| SKU channel revenue | Filter by SKU's linked lot `F_LOT_YEAR` | Filter by SKU creation/sale date year |
| `TBL_FINANCIALS` entries | Filter by `Vintage Year` field | Filter by `Calendar Year` field |

All date-based filters use the year value only (not month/day). Vintage year for pick events is the calendar year of the `F_EV_DATE` field — in winery practice, a 2026 harvest occurs in the fall of 2026 and produces 2026 vintage wine.

---

## Known Simplifications

**Loans balance:** The Balance Sheet Loans line = sum of all `Loan` category entries − sum of all `Loan Repayment` entries for the period. This is an approximation — it does not model true loan amortization schedules or interest. Bookkeepers using this report should note that the Loans figure represents net cash flow from financing, not a precise outstanding principal balance. For compliance-grade reporting, a proper amortization schedule should be maintained outside this system.

---

## Anti-Double-Counting Rules

1. Each cost entry lives in exactly one module's Airtable table — never duplicated
2. BlendingLab cost inheritance is a **transfer**, not a copy — source lot cost is reduced by the exact amount transferred; `commitBlend()` must PATCH source lots atomically with the new lot creation
3. Inherited blend costs are already captured in the Cellar COGS line on the P&L — they do not appear as a separate line. Only **direct** costs added in BlendingLab appear separately
4. Finance dashboard reads each cost table independently and displays them as clearly labeled line items by phase — never sums across cost phases without explicit labeling
5. Inventory value on the Balance Sheet uses `lot total_cost` for active lots only (volume > 0, Stage not Bottled/Disposed) — this reflects only wine currently in cellar at its current cost basis
6. Revenue is derived from SKU channel allocations only — it is not entered manually and cannot be double-entered
