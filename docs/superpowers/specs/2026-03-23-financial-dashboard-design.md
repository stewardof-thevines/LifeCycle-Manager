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

## Cost Ownership Model

Each cost belongs to exactly one module. No module reads or re-sums costs owned by another module. The Finance dashboard is the only place that aggregates across modules, and it does so as clearly labeled line items by phase.

```
Vineyard Operations  →  Harvest  →  Cellar  →  BlendingLab  →  SKUs
(farm labor, sprays,    (pick labor,  (barrels,    (inherited +    (bottle, cork,
 equipment)             hauling)      additions,    direct costs)   label, capsule,
                                      cellar labor)                 packaging labor)
```

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

When a blend is committed:

1. Each component lot has a `cost_per_gal = total_cost ÷ current_volume`
2. `cost_transferred = gallons_pulled × cost_per_gal` (per component)
3. New blend lot cost = sum of all `cost_transferred` values
4. Source lot remaining cost = `original_cost − cost_transferred`
5. Source lot remaining volume = `original_volume − gallons_pulled`
6. `cost_per_gal` on the source lot remains constant — cost and volume reduce together

### Direct Costs on Blend Lots

After a blend is created, direct costs (additives, nutrients, color enhancers, fining agents) may be added to the blend lot itself. These are new cost entries owned by the blend lot — they do not exist in any source lot and are not double-counted with any prior treatment applied to source lots before blending.

**Example:**
- Lot A (300 gal, $8,000 total): received a nutrient treatment pre-blend
- Lot B (300 gal, $6,000 total): no prior treatment
- Blend: 33.33% Lot A (100 gal, $2,667 transferred) + 33.33% Lot B (100 gal, $2,000 transferred)
- Blend inherits: $4,667
- New nutrient added to blend: $200 direct cost entry
- Blend total cost basis: $4,867
- Lot A retains: $5,333 (200 gal remaining)

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
- Derived stat: cost-per-ton shown for each event

### Cellar
- Winemaking costs per lot: barrels, additions, lab fees, cellar labor
- Running cost-per-gallon displayed live as costs are added
- Existing lot cost field extended to support line-item breakdown

### BlendingLab
Two sub-sections:
1. **Inherited** — shows component lots, gallons pulled, and cost transferred from each (read-only, calculated at commit time)
2. **Direct** — entry form for additives/nutrients/enhancers added after the blend is created (name, amount, cost)

Total cost basis displayed = inherited + direct.

### SKUs
- Packaging costs per SKU: bottle, cork, label, capsule, other
- Wine cost auto-populated from linked lot's `cost_per_gal × bottle_volume_ml / 3785`
- Margin and MSRP already exist — no change needed
- Channel allocations updated (see below)

---

## Sales Channels

Current SKUs channels (`Wine Club`, `Wholesale`, `Restaurant`, `DTC / Tasting Room`) updated to:

| Channel |
|---------|
| Wine Club |
| Events |
| Weddings |
| DTC |
| Wholesale |

`Restaurant` → split into `Events` and `Weddings`. `DTC / Tasting Room` → `DTC`. Channel list is updated in the SKUs dropdown and reflected in Finance channel reporting.

---

## Finance_1.0.html Module

A new standalone module following the standard layout: 58px dark topbar, 380px dark left panel, fluid cream main area.

### Airtable: New Table `TBL_FINANCIALS`

Stores manual balance sheet entries. Fields:

| Field | Type | Notes |
|-------|------|-------|
| Entry Name | Text | e.g., "Main Checking", "2022 Tractor" |
| Category | Single select | Cash, Fixed Asset, Loan, Accounts Receivable, Accounts Payable, Operating Expense |
| Amount | Number | Dollar value |
| Date | Date | Entry date |
| Vintage Year | Number | e.g., 2026 — for vintage period filtering |
| Calendar Year | Number | e.g., 2026 — for calendar period filtering |
| Notes | Long text | Optional context |

### Topbar

- Period toggle: **Vintage Year / Calendar Year**
- Year selector dropdown (populated from available data)
- **Export CSV** button — downloads all three documents as separate CSV files
- **Print / PDF** button — triggers `window.print()` with print stylesheet
- Navigation links to each module (Vineyard, Harvest, Cellar, BlendingLab, SKUs)

### Left Panel — Manual Balance Sheet Inputs

Entry form for `TBL_FINANCIALS` records:
- Entry Name
- Category (Cash, Fixed Asset, Loan, A/R, A/P, Operating Expense)
- Amount
- Date
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

Sales breakdown by channel (Wine Club, Events, Weddings, DTC, Wholesale): table showing bottles sold, revenue per channel, and % of total. Simple proportional bar visualization using design system colors.

Navigation tiles linking to each operational module.

#### Tab 2: P&L (Income Statement)

```
Revenue
  Wine Club          $X
  Events             $X
  Weddings           $X
  DTC                $X
  Wholesale          $X
  ─────────────────────
  Total Revenue      $X

Cost of Goods Sold
  Vineyard Operations  $X
  Harvest              $X
  Cellar               $X
  Blending (direct)    $X
  Packaging            $X
  ─────────────────────
  Total COGS           $X

Gross Profit           $X  (XX%)

Operating Expenses     $X  (from TBL_FINANCIALS manual entries)

Net Income             $X
```

#### Tab 3: Balance Sheet

```
Assets
  Current Assets
    Cash & Bank        $X
    Accounts Receivable $X
    Inventory (at cost) $X  ← sum of all active lot cost bases
  Fixed Assets         $X
  ─────────────────────
  Total Assets         $X

Liabilities
  Accounts Payable     $X
  Loans                $X
  ─────────────────────
  Total Liabilities    $X

Equity
  Total Equity         $X  ← Assets − Liabilities (derived)
```

#### Tab 4: Cash Flow Statement

```
Operating Activities
  Net Income                        $X
  Adjustments (working capital)     $X  ← manual entries
  ────────────────────────────────────
  Net Cash from Operations          $X

Investing Activities
  Fixed Asset Purchases             $X  ← from TBL_FINANCIALS Fixed Asset entries
  ────────────────────────────────────
  Net Cash from Investing           $X

Financing Activities
  Loan Proceeds                     $X  ← from TBL_FINANCIALS Loan entries
  Loan Repayments                   $X
  ────────────────────────────────────
  Net Cash from Financing           $X

Net Change in Cash                  $X
Beginning Cash Balance              $X  ← manual entry
Ending Cash Balance                 $X
```

---

## Export

### CSV
One file per document. Filename format:
- `domaine-mathiot-pl-2026-vintage.csv`
- `domaine-mathiot-balance-sheet-2026-vintage.csv`
- `domaine-mathiot-cashflow-2026-vintage.csv`

Labeled rows, numeric values only in value columns. Downloaded individually via separate export buttons or as a group.

### PDF
Uses `window.print()` with `@media print` stylesheet. Print view:
- Hides topbar, left panel, navigation elements
- Outputs active document only in clean single-column layout
- Includes Domaine Mathiot header, period label, and generation date
- No external PDF library required

---

## Implementation Scope

### New file
- `Finance_1.0.html` — standalone Finance module

### Modified files
- `Vineyard_1.4.html` — add Costs section to left panel
- `Harvest_1.4.html` — add cost-per-ton derived stat; surface pick cost in event view
- `Cellar_1.6.html` — extend lot cost field to support line-item breakdown; display cost-per-gal live
- `BlendingLab_1.3.html` — add inherited cost display on blend commit; add direct cost entry form
- `SKUs_1.4.html` — update channel list to Wine Club, Events, Weddings, DTC, Wholesale
- `sw.js` — add Finance_1.0.html to pre-cache shell; bump cache version to `lifecycle-v5`
- `index.html` — add Finance navigation card

### New Airtable table
- `TBL_FINANCIALS` — manual balance sheet entries (created in Airtable, ID hardcoded in Finance module)

---

## Anti-Double-Counting Rules

1. Each cost entry lives in exactly one module's Airtable table — never duplicated
2. BlendingLab cost inheritance is a transfer, not a copy — source lot cost is reduced by the amount transferred
3. Finance dashboard reads each cost table independently and displays them as separate labeled line items — never sums across cost phases without explicit labeling
4. Inventory value on the Balance Sheet uses lot `cost_per_gal × current_volume` — this reflects only unshipped wine at current cost basis, not historical totals
