# Populating Alibaba Data with Chrome

Alibaba listings require Chrome browser for proper scraping. Here's how to populate your database with Alibaba data.

## Prerequisites

### 1. Install Playwright Browsers

Playwright needs Chrome browser installed. Run this ONCE:

```powershell
# Install Playwright with Chrome browser
npx playwright install chromium
```

This downloads Chrome/Chromium that Playwright will use for scraping.

## Quick Start

Run this command to populate Alibaba listings:

```powershell
pnpm alibaba:prime
```

This will:
1. Generate Alibaba search queries
2. **Use Chrome browser** to fetch listings with proper titles, prices, images
3. Save everything to database (SavedListing table)
4. Download all images to `/public/cache/`

## Step-by-Step

### 1. Generate Search Jobs
```powershell
pnpm alibaba:build
```

Creates `scripts/catalogue.alibaba.generated.json` with search queries.

### 2. Fetch & Save Listings (Uses Chrome)
```powershell
pnpm alibaba:ingest
```

This opens Chrome in headless mode to:
- Fetch Alibaba listings
- Extract proper titles, prices, images, MOQ
- Save to database with complete product information

### 3. Download Images
```powershell
pnpm catalog:cache-images
```

Downloads all external images locally for fast loading.

## Configuration

Control what gets ingested with environment variables:

```powershell
# Set environment variables for PowerShell
$env:ALI_LIMIT=500           # Listings per search query (default: 360)
$env:ALI_HEADLESS=1          # Use headless Chrome (recommended)
$env:ALI_CATEGORIES="consumer-electronics,sports-entertainment"  # Specific categories
$env:ALI_TERMS_CAP=10        # Limit search terms per category (0 = no limit)
$env:ALI_JOBS_CAP=100        # Limit total jobs (0 = no limit)

# Then run
pnpm alibaba:prime
```

Or in `.env.local` file:
```env
ALI_LIMIT=500
ALI_HEADLESS=1
ALI_CATEGORIES=consumer-electronics,sports-entertainment
ALI_TERMS_CAP=10
ALI_JOBS_CAP=100
```

## Example: Test Run (Recommended First)

Test with just a few listings to make sure Chrome works:

```powershell
$env:ALI_LIMIT=20; $env:ALI_JOBS_CAP=3; pnpm alibaba:prime
```

## Example: Full Production Run

Comprehensive Alibaba data ingestion:

```powershell
$env:ALI_LIMIT=500; pnpm alibaba:prime
```

## Why Chrome Instead of Edge?

The scraping code uses **Playwright with Chromium** (which is Chrome's open-source version). Alibaba's website works better with Chrome/Chromium than Edge for scraping purposes.

## Viewing Results

After running `pnpm alibaba:prime`, your Alibaba products will be available at:
- http://localhost:3007/products (ALL tab)
- http://localhost:3007/products?platform=ALIBABA

The listings will have:
- ✅ Proper titles
- ✅ Actual prices with tiers
- ✅ Product images
- ✅ Supplier information
- ✅ MOQ details
- ✅ Served from DATABASE (no more crashes!)

## Troubleshooting

### Error: "chromium not found" or "Could not find browser"

**Solution**: Install Playwright browsers:
```powershell
npx playwright install chromium
```

### Error: Script crashes or times out

**Solution**: Reduce the limits:
```powershell
$env:ALI_LIMIT=100; $env:ALI_JOBS_CAP=20; pnpm alibaba:ingest
```

### Error: Chrome window opens but nothing happens

**Solution**: Try with visible browser (not headless) to see what's happening:
```powershell
$env:ALI_HEADLESS=0; pnpm alibaba:ingest
```

### Want to scrape specific products only

**Solution**: Edit `scripts/categories.data.ts` to customize the `featured` terms for each category, then:
```powershell
pnpm alibaba:build
pnpm alibaba:ingest
```

## Populate BOTH Alibaba + Made-in-China

To populate both platforms at once:

```powershell
# Populate Alibaba
pnpm alibaba:prime

# Populate Made-in-China
pnpm mic:prime
```

Or run both together:
```powershell
pnpm alibaba:prime; pnpm mic:prime
```

## Re-ingesting / Updating

To refresh Alibaba data (get new listings):

```powershell
# This adds NEW listings without removing existing ones
pnpm alibaba:prime
```

## Database Schema

Listings are saved to the `SavedListing` table with:
- `platform`: 'ALIBABA'
- `title`: Product title
- `url`: Alibaba product URL
- `image`: Product image URL
- `priceRaw`: Price text (e.g., "$1.50-$3.00")
- `priceMin`, `priceMax`, `currency`: Parsed price values
- `moqText`: MOQ information
- `supplierName`: Supplier company name
- `detailTitle`: Enhanced title from detail page

The products page will automatically use this data instead of scraping in real-time, giving you:
- ⚡ Fast page loads
- 🚀 No crashes
- ✅ Complete product information
- 📦 Thousands of listings ready instantly
