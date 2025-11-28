# MOQ Pools – Complete MVP (Supplier Drop‑Ship)
# MOQ Pools – Complete MVP (Supplier Drop‑Ship)

## Quick Start
```bash
pnpm install
cp .env.example .env
# set DATABASE_URL and APP_BASE_URL
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

## Routes
 `/products` – list pools
 `/p/:id` – product page → join & pay (Stripe)
 `/pay/success` – success
 `/admin/pools` – export CSV & place order
 `/admin/payments` – list payments
 `/admin/shipments` – upload tracking CSV

## Stripe (dev)
```bash
stripe listen --events checkout.session.completed --forward-to http://localhost:3000/api/webhooks/stripe
```

Then put the printed `whsec_...` in `.env` as `STRIPE_WEBHOOK_SECRET`.

## Environment variables (Turnstile)

If you want Cloudflare Turnstile protection enabled on the register page, add the following to your `.env`:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```

If these are not set, the widget will not render and server-side verification will be skipped.

## External listings (Alibaba / 1688 / Made-in-China / IndiaMART)


- `GET /api/external/aggregate?platform=ALL|ALIBABA|C1688|MADE_IN_CHINA|INDIAMART&q=term&offset=0&limit=100&minPrice=&maxPrice=&minMoq=&maxMoq=`

Notes:
- Currency detection (₹ / Rs / INR) normalizes to `currency: "INR"` while preserving original `price` string.
- MOQ parsing extracts common patterns: `MOQ 100`, `Minimum Order Quantity 5`, `≥ 50`.
- `scripts/ingestIndiaMartMnuTree.ts` Traverse and ingest the full IndiaMART export category subtree rooted by a URL token (default `mnu`).

### IndiaMART "mnu" subtree ingestion & browsing

The `mnu` token corresponds to a family of export.indiamart.com category URLs. To ingest and then view listings for all categories and subcategories containing this token:

Ingest (dry run first):

```
pnpm ts-node scripts/ingestIndiaMartMnuTree.ts --debug --dry
```

Run for real with detail enrichment (optional):

```
pnpm ts-node scripts/ingestIndiaMartMnuTree.ts --detail --per-detail 5 --page-limit 120 --sparse-threshold 6 --min-informative 2
```

Browse in the app (development server required):

Open: `/indiamart?category=mnu` (defaults to `mnu` if omitted). Pagination query params: `page`, `pageSize` (max 100). `recursive=1` aggregates descendant categories.

UI page form fields:
- `category` slug (derived from export category label slugification used during ingestion)
- `pageSize` (1–100, defaults 40)

Pagination links are rendered at the bottom (capped at 50 pages for safety). Example direct navigation:

```
/indiamart?category=mnu&page=3&pageSize=60

### Preloading a Specific Top-Level IndiaMART Group (Instant Category Clicks)

If the UI taxonomy shows groups like “Building Construction Material & Equipment” but clicking a subgroup returns no listings yet, preload all leaves under that group:

```
pnpm ts-node scripts/ingestIndiaMartGroup.ts --group "Building Construction Material & Equipment" --limit 180 --terms 2 --headless
```

This script:
- Enumerates all subgroups and leaves under the target top-level group
- For each leaf, gathers up to `--terms` ordered search terms (leaf term + aliases fallback) using the taxonomy utilities
- Optionally (default) uses subgroup label itself as a seed when the subgroup has zero leaves (so the UI still shows items)
- Applies consistent quality + MOQ filters
- Stores `leafKey` (e.g. `brick-making-machines`) and derived term slug in `SavedListing.categories` for quick retrieval

API to fetch listings for a single leaf/subgroup key:

```
/api/indiamart/leaf?key=fly-ash-brick-making-machine&page=1&pageSize=40
```

UI integration guidance:
- When a user clicks a leaf node, call `/api/indiamart/leaf?key=<leafKey>`.
- If response `total === 0`, you can enqueue a background ingestion for just that leaf using the bulk script (`ingestIndiaMartBulk`) or group script.
- For preloading multiple groups ahead of time, run the group ingestion script for the most trafficked top-level groups on a schedule or deployment hook.

```

API endpoint example:

```
/api/indiamart/listings?category=mnu&recursive=1&page=1&pageSize=40
```

Saved listings are stored in `SavedListing` with `platform='INDIAMART'` and category slugs derived via the same slug logic used in ingestion scripts.

- Optional `cacheImages` flag to store images locally via `imageCache` (use for ingestion / catalog priming jobs).
 - INR currency parsing added (₹ / INR / Rs.) so pricing filters can work with IndiaMART listings.

Example (script usage):
```bash
cross-env TS_NODE_PROJECT=tsconfig.scripts.json node -r ts-node/register -r tsconfig-paths/register scripts/printIndiaMart.ts "usb fan"
```

## Category Metadata & Ingestion Rotation

To broaden coverage evenly across verticals (including new IndiaMART‑aligned ones) a lightweight rotation system generates search jobs from the category model.

### Category Fields (extended)
Each entry in `src/lib/categories.ts` now supports:

- `term`: Primary canonical search term (always included)
- `aliases`: Alternative phrasings / pluralizations (optional; lower weight)
- `featured`: Curated high‑intent subterms (optionally sampled)
- `tags`: Semantic grouping labels (e.g. `industrial`, `medical`, `packaging`)
- `weight`: Relative emphasis (default 1; >1 increases frequency)
- `ingest.priority`: Higher number floats earlier in global ordering
- `ingest.maxFeaturedPerCycle`: Cap featured queries per category per rotation

### Rotation Logic
Implemented in `src/lib/categoryRotation.ts`:
1. Categories sorted by (priority desc, weight desc)
2. For each category we build a bucket: base term + a shuffled slice of featured + (optionally) aliases
3. Bucket trimmed to `perCategory` (default 6) while ensuring the base term is retained
4. Global list lightly re‑shuffled with a score influenced by RNG, priority, and weight
5. Determinism: pass a `seed` to reproduce job sequences

### Generating Job Config JSON
Script: `scripts/buildCategoryRotationConfig.ts`

Usage examples:
```bash
# Default (all platforms logical placeholder 'ALL')
node dist/scripts/buildCategoryRotationConfig.js > rotation.json

# With ts-node during development
cross-env TS_NODE_PROJECT=tsconfig.scripts.json node -r ts-node/register -r tsconfig-paths/register scripts/buildCategoryRotationConfig.ts --seed=42 --per-category=5 --max-total=80 > rotation.json

# Disable aliases
... buildCategoryRotationConfig.ts --no-aliases --max-total=120 > rotation.json

# Only 40 total jobs, include all alias + featured terms
... buildCategoryRotationConfig.ts --seed=123 --per-category=4 --max-total=40 > rotation.json
```

Generated JSON shape:
```jsonc
{
	"generatedAt": "2025-09-24T10:11:12.345Z",
	"platform": "ALL",
	"categories": 74,
	"jobs": [
		{ "platform": "ALL", "q": "hospital beds", "limit": 180 },
		{ "platform": "ALL", "q": "syringe", "limit": 180 },
		{ "platform": "ALL", "q": "nebulizer machine", "limit": 180 }
	]
}
```

### Feeding Jobs Into Ingestion
You can iterate the `jobs` array and call the existing external search endpoint, or a headless provider function directly (for batch seeding / caching images):
```ts
// pseudo-code
import fs from 'node:fs';
import fetch from 'node-fetch';
const cfg = JSON.parse(fs.readFileSync('rotation.json','utf8'));
for (const job of cfg.jobs) {
	const url = new URL('http://localhost:3000/api/external/search');
	// Upsert listings or trigger downstream processing...
}
```

### Tuning Strategy
- Increase `weight` for under‑represented but valuable verticals
- Use `aliases` sparingly; they dilute focus—prefer `featured` for high‑intent terms
- Set `ingest.priority` high (e.g. 5) for launch‑critical categories (medical / packaging) so they appear earlier each cycle
- Adjust `--per-category` vs `--max-total` to balance breadth vs depth

	### IndiaMART Export Directory Fallback

	Some niche medical / textile subcategories surface more reliably on the export‑focused domain `export.indiamart.com`. When the primary IndiaMART scraper returns fewer than 4 listings for a term, an automatic lightweight fallback now queries the export search page. If it finds a richer set, those listings are used instead. This improves coverage for terms like “Disposable Fabrics” or narrow drape / gown variants.

	Enabled by default. To disable set:
	```
	ENABLE_IM_EXPORT_FALLBACK=0
	```
	in your `.env` and restart.

	### Discover Additional Export Categories

	Script: `scripts/buildIndiaMartExportCategories.ts`

	Example:
	```bash
	pnpm ts-node scripts/buildIndiaMartExportCategories.ts --seeds "Hospital Linen,Medical Scrub" --limit 3 --out exportCats.json --debug 1
	```

	Outputs JSON like:
	```jsonc
	{
		"generatedAt": "2025-10-06T12:34:56.000Z",
		"seeds": ["Hospital Linen","Medical Scrub"],
		"results": {
			"Hospital Linen": [ { "label": "Hospital Bed Sheet", "count": 3227, "url": "https://export.indiamart.com/search.php?..." } ]
		}
	}
	```

	Flags:
	- `--seeds` Comma or pipe separated list of starting terms
	- `--limit` Top N subcategories (by parsed count) to enqueue per term
	- `--out` Output filename (default `indiamart.export.categories.json`)
	- `--debug 1` Verbose logging

	Use discovered labels as new ingestion seeds or to enrich the hierarchical taxonomy.

	### Export Ingestion Script

	Script: `scripts/ingestIndiaMartExport.ts`

	Purpose: crawl export categories (with limited breadth/depth) and persist listings into SavedListings when the primary directory is sparse.

	Example:
	```bash
	pnpm ts-node scripts/ingestIndiaMartExport.ts --seeds "Hospital Linen,Medical Scrub" --depth 2 --per 3 --limit 150 --detail 0 --debug 1
	```
	Flags:
	- `--seeds` Seed terms
	- `--depth` BFS depth (default 1)
	- `--per` How many top subcategories (by count) to expand per term (breadth)
	- `--limit` Max listings per term for primary IndiaMART fetch before considering export anchors
	- `--detail 1` Fetch export product detail pages for better titles/prices (slower)
	- `--debug 1` Verbose logging

	### Adaptive Warm Fetch Suppression

	The IndiaMART background “warm” full fetch is skipped when the initial prefetch returns ≥ 40 items, reducing unnecessary duplicate provider calls on rich categories. Threshold can be tuned in `IndiaMartWarmFetchClient` (`initialCount >= 40`).
### Future Enhancements (Optional)
- Persist rotation state to skip already‑queried jobs mid‑cycle
- Telemetry: adapt weights based on conversion / click metrics
- Tag‑scoped generation: add CLI `--tag=medical,industrial` filter
- Multi‑platform splitting: emit separate jobs per platform (ALIBABA, INDIAMART, etc.) instead of placeholder `ALL`

---

If you add new categories, just supply at minimum: `{ key, term }`. The rotation will immediately include them using defaults.


## IndiaMART Hierarchical Taxonomy & Fallback Search

IndiaMART uses a dedicated hierarchical taxonomy (separate from the flat `categories.ts`) defined in `src/lib/indiamartCategories.ts`:

Structure:
```
Top Level Group
	└─ Subgroup (node)
			 └─ Leaves (searchable leaves with primary term + optional aliases)
```

Example (excerpt):
```
Hospital and Medical Equipment
	└─ Medical Laboratory Instruments
			 ├─ Rapid Test Kit
			 ├─ Biochemistry Analyzer
			 └─ Hematology Analyzers
```

### UI
`<IndiaMartCategoryMenu />` renders only when the active platform is `INDIAMART` (via `PlatformProvider` / `usePlatform`). Selecting a leaf emits ordered fallback terms.

### Fallback Strategy
When a leaf is chosen we build an ordered list of escalating search terms:
1. Leaf primary `term`
2. Any `aliases`
3. Parent subgroup label
4. Top-level group label

The API route `GET /api/external/search` now supports:
- `lk=<leafKey>` (IndiaMART only) to auto-expand fallback list.
- Manual multi-term fallback using `q=termA||termB||termC`.

Escalation stops early once a minimum result threshold is reached or all terms are exhausted. Duplicates are deduped by URL.

### Helpers
`getIndiaMartSearchTerms(leafKey)` returns the ordered unique list used for fallback.
`findIndiaMartLeaf(leafKey)` finds the leaf metadata (label, term, aliases).

### Extending the Taxonomy
1. Add / edit groups, subgroups, or leaves in `indiamartCategories.ts` (ensure unique `key`).
2. Provide a `term` (normalized search phrase). Add `aliases` only when they materially surface different supplier sets.
3. No rebuild needed—Next.js hot reload picks up changes; UI + API fallback will immediately include them.

### Why Separate From Generic Categories?
- IndiaMART vertical breadth & naming differs from Alibaba / 1688; a shared flat list caused noisy / low-yield queries.
- Hierarchical UX improves discoverability and supports context-aware fallback when niche leaves have sparse supply.

### Future Ideas
- Persist per-leaf success metrics to adapt alias ordering.
- Add weight/prioritization to subgroups similar to main rotation logic.
- Offer combined cross-platform mapping (e.g., map an IndiaMART leaf to analogous Alibaba terms) for comparative sourcing.

---

### Troubleshooting (IndiaMART)
| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Few/no results for a specific leaf | Niche term or requires headless | Retry with headless=1 or rely on fallback escalation |
| Duplicates across fallback terms | Same listing matches multiple broader terms | URL-based dedupe already applied; safe to ignore |
| Very slow queries | Headless Playwright render engaged | Disable headless (`&headless=0`) to compare baseline |

### Bulk IndiaMART Ingestion
For deeper coverage (so category pages show many listings immediately) use the bulk script which walks every taxonomy leaf and ingests the first N terms.

Script: `scripts/ingestIndiaMartBulk.ts`

Added npm script:
```bash
pnpm run indiamart:bulk             # default limit=300, terms per leaf=2, headless off
pnpm run indiamart:bulk -- --limit 500 --terms 3 --headless 1 --debug 1
```

Flags:
- `--limit <n>`   max items per term (capped internally)
- `--terms <n>`   number of terms per leaf (default 2)
- `--headless 1`  enable Playwright headless fallback
- `--resumeJson path` keep progress & skip already ingested pairs
- `--debug 1`     verbose scraping logs

Progress file example (resume):
```json
{
	"hospital_laboratory::rapid test kit": 112,
	"hospital_laboratory::biochemistry analyzer": 98
}
```

Run it periodically to grow the local SavedListing cache; front-end will pick up more listings instantly via snapshot/saved queries before live scraping.


### Live Leaf Ingestion (High Fidelity, No Export Fallback)
Script: `scripts/ingestIndiaMartLeavesLive.ts`

Purpose: replicate the accurate behavior seen on strong leaves (e.g. X Ray Machine) across the entire taxonomy.

Key mechanics:
- Prefetch probe (`--prefetch`, default 60) per term; only escalate if probe count ≥ `--threshold` (default 30).
- Skips export fallback entirely to avoid stale / unreachable listings.
- Quality + MOQ filtering + canonical-key dedupe.
- Resumable with `--resume progress.json`.

Usage:
```bash
pnpm run indiamart:ingest:lives

# Custom tuning + resume
pnpm ts-node scripts/ingestIndiaMartLeavesLive.ts --limit 180 --terms 3 --prefetch 70 --threshold 35 --resume live.progress.json --debug
```
Flags: `--limit <n>` per leaf kept target, `--terms <n>`, `--prefetch <n>`, `--threshold <n>`, `--headless`, `--min-informative <n>`, `--allow-accessories`, `--resume <file>`, `--dry`, `--debug`.

### Subgroup / Group Click Fallback
`getIndiaMartSearchTerms(key)` now also accepts a subgroup or top-level group key:
* Returns the group label itself + sample of first leaf terms (breadth-first) so category clicks are never empty.
* Products page uses `lk=<key>` to derive a primary term when `q` is missing or too short.

### Validation / Prune Stale Listings
Script: `scripts/validateIndiaMartListings.ts`

Removes INDIAMART `SavedListing` records that are 404, redirect off-domain, or resolve to generic directory pages.

Examples:
```bash
# Dry run (first 1500)
pnpm ts-node scripts/validateIndiaMartListings.ts --limit 1500 --dry --debug

# Full validation
pnpm run indiamart:validate
```

Recommended sequence for a fresh or noisy dataset:
```bash
pnpm run indiamart:validate   # optional first pass if legacy data
pnpm run indiamart:ingest:lives
```

### Troubleshooting Empty Clicks
1. Confirm the URL includes `lk=<key>`.
2. Hit `/api/indiamart/leaf?key=<key>`; if `total=0`, ingestion hasn’t produced items yet.
3. Run a focused group ingest:
```bash
pnpm ts-node scripts/ingestIndiaMartGroup.ts --group "Building Construction Material & Equipment" --limit 180 --terms 2
```

## IndiaMART Image Pipeline & JPG Uniformity

IndiaMART listings originally ingested with a placeholder image (e.g. `/seed/sleeves.jpg`) are now upgraded to real product images and normalized to **JPG** for consistent UX and compression.

### Stages
1. Ingestion / Bulk / Live scripts capture the first page image URL and immediately attempt to cache it locally via `cacheExternalImage`.
2. Detail page enrichment (during ingestion/backfill/refresh) fetches the product detail HTML and scores candidate images (prefers large `imimg` / IndiaMART CDN images, penalizes logos/icons) choosing a higher quality main image when the initial one is low‑signal or a placeholder.
3. Caching enforces JPG for IndiaMART hosts when `preferJpgForIndiaMart` flag is set (now default in all IndiaMART image code paths). Non‑JPG inputs (PNG/WEBP) are converted using `sharp` with a white background flatten for transparent assets.
4. A retroactive conversion script migrates legacy cached PNG/WEBP images already stored under `public/cache` to JPG and updates the `SavedListing.image` path.

### Key Scripts
| Purpose | Script | Typical Usage |
|---------|--------|---------------|
| Backfill placeholder or missing images | `scripts/backfillIndiaMartImages.ts` | `pnpm run indiamart:backfill:images -- --limit 300 --headless 1` |
| Refresh low‑quality (tiny/icon) images | `scripts/refreshIndiaMartImages.ts` | `pnpm run indiamart:refresh:images -- --where-missing 1 --limit 300` |
| Diagnose current image mix | `scripts/diagnoseIndiaMartImages.ts` | `pnpm ts-node scripts/diagnoseIndiaMartImages.ts --debug 1` |
| Convert existing PNG/WEBP to JPG | `scripts/convertIndiaMartImagesToJpg.ts` | `pnpm run indiamart:images:convert` |

### Conversion Script
The conversion only processes `SavedListing` rows with `platform='INDIAMART'` whose `image` matches `/cache/<sha1>.png|webp`. For each it:
1. Locates `public/cache/<sha1>.<ext>`
2. Uses `sharp` to flatten + re‑encode as `/cache/<sha1>.jpg`
3. Updates DB record; deletes old file (unless `--keep-old=1`)

Flags:
```
--limit <n>       Max rows to scan (default 400)
--dry=1           Do everything except write DB / delete old file
--keep-old=1      Preserve original PNG/WEBP after conversion
--debug=1         Verbose logging + skip reason breakdown
```

Examples:
```bash
# Dry run sample 40 with debug
pnpm run indiamart:images:convert -- --limit 40 --dry=1 --debug=1

# Real conversion (default limit 400)
pnpm run indiamart:images:convert
```

### Interpreting Output
```
Converted=5 Skipped=130 Errors=0
Skip breakdown: noSharp=0 missingFile=130 badExt=0
```
Skip reasons:
- `noSharp` – `sharp` wasn’t loaded (see remediation below)
- `missingFile` – DB pointed at a file no longer on disk (stale entry); run a refresh/backfill to repopulate
- `badExt` – Not a PNG/WEBP target (already .jpg or other)

### Ensuring `sharp` Works
`sharp` is a devDependency and should auto‑install prebuilt binaries. Verify:
```bash
pnpm list sharp --depth 0
node -e "require('sharp');console.log('ok')"
```
If load fails (or conversions log `noSharp`):
```bash
pnpm rebuild sharp
# Optional verbose diagnostic
node -e "try{require('sharp');console.log(require('sharp').versions)}catch(e){console.error(e)}"
```
PowerShell sometimes pastes stray characters from earlier output; retype commands manually if you see `Unexpected token` errors.

### When Files Are Missing
If most entries report `SKIP_MISSING_FILE` the cache file was deleted (cleaned or never cached). Run a refresh to re‑fetch them in JPG directly (skipping conversion):
```bash
pnpm run indiamart:refresh:images -- --where-missing 1 --limit 400 --headless 1
```
Then re‑run the conversion script (it will now find fewer or zero PNG/WEBP rows if caching produced JPGs up front).

### UI / Display
`SavedListing.image` now stores `/cache/<sha1>.jpg` for IndiaMART listings (post‑conversion). The products and listing pages simply render this path; mixed formats should phase out after one conversion/refresh cycle.

### Troubleshooting Checklist
| Symptom | Action |
|---------|--------|
| All conversions `SKIP_NO_SHARP` | Rebuild `sharp` (`pnpm rebuild sharp`) and re‑run with `--debug=1` |
| Many `SKIP_MISSING_FILE` | Run refresh/backfill to re‑cache originals, then convert (or accept they’re gone) |
| High Errors count | Re-run with `--limit` smaller + `--debug=1` to isolate failing IDs |
| Mixed .png/.webp still appear after conversion | They may be new ingest files; ensure ingestion uses JPG preference (already default) |

### Operational Runbook
1. Bulk / live ingestion (seeds new listings, immediate JPG caching)
2. Backfill (replaces placeholders)
3. Refresh (improves weak tiny/icon images)
4. Conversion (one-time cleanup of legacy PNG/WEBP)
5. Periodic refresh (weekly) to catch better detail images introduced later

All steps are idempotent; safe to re‑run with conservative `--limit` slices.

4. Or run the live leaves script to cover everything.


### IndiaMART Bad Image Backfill (Blur Placeholder Removal)

Some historical IndiaMART listings were ingested with a pervasive low‑quality blurred stock photo. Its SHA‑1 hash appears in `BAD_IMAGE_HASHES` (e.g. `bbb71cb4979e0c433b6f0ac4eabc2d688e809d39`). These appear as `/cache/<hash>.jpg` and degrade UX.

Script: `scripts/backfillIndiaMartBadImages.ts`

Purpose:
- Detect `SavedListing` rows (`platform=INDIAMART`) whose `image` path references a bad hash.
- Revisit the product detail page, score candidate images (leveraging existing provider logic) and pick a higher quality main image.
- Cache the upgraded image locally (forcing JPG) and update the DB.

Usage:
```bash
# Dry run (no writes) – sample first 200
pnpm ts-node scripts/backfillIndiaMartBadImages.ts --dry-run 1 --limit 200

# Real run (limit 400, higher concurrency)
pnpm ts-node scripts/backfillIndiaMartBadImages.ts --limit 400 --concurrency 8

# Small verification batch
pnpm ts-node scripts/backfillIndiaMartBadImages.ts --limit 40
```

Flags:
- `--limit <n>`        Max bad rows to attempt (default 500; internally over‑fetches then filters).
- `--dry-run 1`        Simulate only; logs improvements without persisting.
- `--concurrency <n>`  Parallel workers fetching detail pages (default 4, max 16).

Operational Notes:
- Safe to re-run; once improved the listing no longer matches a bad hash.
- Skips if re-fetched best image still maps to a bad hash (no downgrade).
- First 10 failures log details; increase concurrency gradually if hitting rate limits.
- Extend `BAD_IMAGE_HASHES` as more generic placeholders discovered; rerun to clean.

UI Behavior Update (Oct 2025): Listings that still reference a bad hash now show an "Upgrading" placeholder while a background client-side upgrade attempt runs. Once the improved image is cached it appears in-place without page reload.



## Alibaba – Bulk Ingestion, Variations, and Caching

Use these scripts to ingest many more Alibaba listings across all categories and cache images locally. Variations (e.g., wholesale, factory, low moq, private label) are generated automatically to surface broader supplier sets.

PowerShell examples:

```powershell
# Build job config (all categories, default modifiers)
pnpm run alibaba:build

# Ingest into SavedListing
pnpm run alibaba:ingest

# Ingest + cache images locally (recommended)
pnpm run alibaba:prime

# Optional: refresh images per featured subcategory using product detail pages
pnpm run alibaba:refresh:images

# Focus on specific categories and tune limits/modifiers
$env:ALI_CATEGORIES = "consumer-electronics,tools-hardware"; $env:ALI_LIMIT = "480"; $env:ALI_TERMS_CAP = "8"; pnpm run alibaba:prime

# Override modifiers to generate specific variations
$env:ALI_MODIFIERS = "wholesale,bulk,factory,private label,ready to ship,low moq"; pnpm run alibaba:build

# Enable headless rendering in job generation (helps some searches)
$env:ALI_HEADLESS = "1"; pnpm run alibaba:build
```

Notes:
- Generated config: `scripts/catalogue.alibaba.generated.json`.
- The products page already reads `SavedListing`, so new listings appear in `/products` as ingestion progresses.
- For very large runs, consider batching categories and adjusting `$env:ALI_TERMS_CAP` to control breadth per run.


