# Fix All Alibaba Listings

This will re-scrape all 113,858+ Alibaba listings that have incomplete data.

## Prerequisites

1. **Playwright installed** ✅ (Already done)
2. **Dev server running** - Required!

## Steps

### 1. Start the dev server (if not running)

```bash
pnpm run dev
```

Leave this running in a separate terminal.

### 2. Run the fix script

```bash
node fix-all-alibaba-client.js
```

## What it does

- Processes listings in batches of 5
- 2-second delay between each request (to avoid rate limiting)
- Calls `/api/rescrape` endpoint to re-scrape each listing
- Updates database with fresh data
- Shows progress and ETA

## Expected results

- **Good**: ≥10 attributes (full product specifications)
- **Partial**: 1-9 attributes (some data but incomplete)
- **Bad**: 0 attributes (scraping failed, fallback data)

## Estimated time

- ~113,858 listings ÷ 5 per batch × 2 seconds = ~12.5 hours
- Actual time may vary based on network and Alibaba's response times

## Monitoring

The script shows:
- Current batch number
- Individual listing results (✅ Good, ⚠️ Partial, ❌ Bad)
- Overall progress percentage
- Processing rate (listings/second)
- ETA (estimated time remaining)

## Stopping and resuming

You can Ctrl+C to stop anytime. When you re-run, it will only process listings that still need fixing (those with <10 attributes).
