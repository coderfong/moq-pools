# Populating Made-in-China Data

Instead of scraping on every page load (which crashes), populate your database once with Made-in-China listings.

## Quick Start

Run this single command to populate everything:

```powershell
pnpm mic:prime
```

This will:
1. Generate search queries for Made-in-China
2. Fetch listings and save to database (SavedListing table)
3. Download all images to `/public/cache/`

## Step-by-Step (Optional)

If you want more control:

### 1. Generate Search Jobs
```powershell
pnpm mic:build
```

This creates `scripts/catalogue.mic.generated.json` with search queries.

### 2. Fetch & Save Listings
```powershell
pnpm mic:ingest
```

This fetches Made-in-China listings and saves them to your database with:
- Proper titles
- Prices
- Images
- MOQ
- Supplier info

### 3. Download Images Locally
```powershell
pnpm catalog:cache-images
```

Downloads all external images to `/public/cache/` for fast loading.

## Configuration

Control what gets ingested with environment variables in `.env.local`:

```env
# How many listings per search query (default: 320)
MIC_LIMIT=500

# Which categories to ingest (comma-separated)
# Leave empty for all categories
MIC_CATEGORIES=consumer-electronics,sports-entertainment

# Limit search terms per category (0 = no limit)
MIC_TERMS_CAP=10

# Limit total jobs generated (0 = no limit)  
MIC_JOBS_CAP=100

# Use headless browser (slower but more reliable)
MIC_HEADLESS=true

# Custom search modifiers (comma-separated)
MIC_MODIFIERS=wholesale,bulk,supplier,factory
```

## Example: Quick Test Run

Ingest just a few listings to test:

```powershell
$env:MIC_LIMIT=50; $env:MIC_JOBS_CAP=5; pnpm mic:prime
```

## Example: Full Production Run

Ingest comprehensive data:

```powershell
$env:MIC_LIMIT=500; pnpm mic:prime
```

## Viewing Results

After running `pnpm mic:prime`, your Made-in-China products will be available at:
- http://localhost:3007/products (ALL tab)
- http://localhost:3007/products?platform=MADE_IN_CHINA

The listings will have:
- ✅ Proper titles (not "1/ 6")
- ✅ Actual prices
- ✅ Product images
- ✅ Supplier information
- ✅ MOQ details

## Re-ingesting

To refresh Made-in-China data (get new listings):

```powershell
# This will add NEW listings without removing existing ones
pnpm mic:prime
```

## Troubleshooting

**Issue**: Script crashes or times out

**Solution**: Reduce the limits:
```powershell
$env:MIC_LIMIT=100; $env:MIC_JOBS_CAP=20; pnpm mic:ingest
```

**Issue**: Want specific products only

**Solution**: Edit `scripts/categories.data.ts` to customize the `featured` terms for each category, then run:
```powershell
pnpm mic:build
```

## Database Schema

Listings are saved to the `SavedListing` table with:
- `platform`: 'MADE_IN_CHINA'
- `title`: Product title
- `url`: Made-in-China product URL
- `image`: Product image URL
- `priceRaw`: Price text
- `moqText`: MOQ information
- `supplierName`: Supplier name
- `detailTitle`: Enhanced title from detail page (if available)

The products page will automatically use this data instead of scraping in real-time.
