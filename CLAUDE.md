# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LifeCycle Manager** is a winery operations management PWA for Domaine Mathiot. It manages the full wine production lifecycle—vineyard labor, harvest tracking, cellar operations, blending, and SKUs—backed by Airtable as the database.

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no framework, no build step)
- **Backend**: Single Vercel serverless function (`api/airtable.js`) acting as a reverse proxy to Airtable
- **Database**: Airtable (`BASE_ID = 'appJNEHG8sqXmdYGe'`)
- **Hosting**: Vercel (auto-deploys on push to `main`)
- **Auth**: Clerk (integrated but currently disabled in `api/airtable.js`)

## Development & Deployment

There is no build toolchain. Files are served directly from the repo.

- **Local preview**: Open any HTML file directly in a browser, or use `npx serve .` for local static serving
- **Deploy**: `git push origin main` — Vercel auto-deploys
- **Cache bust**: Bump the cache name in `sw.js` (currently `lifecycle-v3`) after any CSS or JS change

## Architecture

### Request Flow

```
HTML module → fetch('/api/airtable') → api/airtable.js (Vercel fn) → Airtable REST API
```

All Airtable operations (GET/POST/PATCH/DELETE) go through the single proxy at `/api/airtable.js`. The frontend passes query params or JSON body; the proxy forwards with the stored API key.

### Module Structure

Each operational area is a single self-contained HTML file with embedded `<style>` and `<script>`:

| File | Domain |
|------|--------|
| `index.html` | Dashboard/navigation hub |
| `Vineyard_1.4.html` | Block management, labor logs, farm costs |
| `Harvest_1.4.html` | Pick events, scale tickets, tonnage |
| `Cellar_1.6.html` | Wine lots, vessels, production stages |
| `BlendingLab_1.3.html` | Blend recipes, trials, bottle yield |
| `SKUs_1.4.html` | Products, pricing, sales channels |

### API Proxy (`api/airtable.js`)

Accepts requests with these params/body fields:
- `baseId`, `tableId` — target Airtable table
- `filterByFormula`, `sort`, `maxRecords` — for GET filtering
- `fields`, `records` — for POST/PATCH payloads

CORS is locked to the configured `ALLOWED_ORIGIN` env var.

### Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `AIRTABLE_API_KEY` | Airtable personal access token |
| `ALLOWED_ORIGIN` | CORS whitelist (production domain) |
| `CLERK_SECRET_KEY` | Clerk auth (currently unused—auth is disabled) |

### PWA / Service Worker

`sw.js` caches the app shell with a cache-first strategy for static assets and network-first for API calls. Bump `CACHE_VERSION` whenever deploying changes to static files to force cache invalidation.

## Design System

### Color Tokens

| Token | Value | Role |
|-------|-------|------|
| `--grenadine` | `#D44720` | Primary action |
| `--beeswax` | `#E9A752` | Secondary accent |
| `--darlington` | `#ACCAB2` | Sage green |
| `--latte` | `#786140` | Neutral brown |
| `--cream` | `#F5EFE4` | Page background |
| `--dark` | `#1e1710` | Topbar and panels |
| `--white` | `#ffffff` | Card backgrounds |

### Typography

- **Playfair Display** — headings
- **Barlow Condensed** — labels and stats
- **Barlow** — body text

### Layout

- `58px` dark sticky topbar
- `380px` dark left panel
- Fluid cream main area
- Optional `360px` dark right panel
- Forms always in dark panels — never in modals

### Service Worker

Current cache name: `lifecycle-v3`. Bump to `lifecycle-v4` (and increment on each subsequent CSS or JS change) — do not reuse a version name once deployed.

### Auth

Do not re-enable Clerk authentication until a custom domain is purchased.

## Key Conventions

- **No framework**: All logic is vanilla JS within `<script>` tags
- **Embedded styles**: CSS lives in `<style>` blocks within each HTML file; use the design system tokens defined above — do not introduce ad-hoc color values
- **Airtable IDs are hardcoded** in each module's `<script>` block—update there when table structure changes
- **Version numbers in filenames** (e.g., `_1.4`) are manual—update filename and all internal references when bumping
