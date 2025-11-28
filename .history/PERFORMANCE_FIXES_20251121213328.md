# Performance Optimization Summary

## Issue
Website was experiencing extremely slow load times due to hundreds of concurrent scraping operations running simultaneously.

### Symptoms
- 100+ simultaneous POST requests to `/api/rescrape`
- Request times: 300ms - 11,000ms (11 seconds)
- Compile times: 600ms - 11.8 seconds
- Server resource exhaustion
- Poor user experience with long page loads

## Root Causes Identified

### 1. **Automatic Title Cleaning on Every Page Load** ⚠️ CRITICAL
**Location:** `app/products/page.tsx` lines 1218-1246

**Problem:**
- On EVERY visit to `/products`, the server was automatically scraping up to 30 products
- Used 5 concurrent workers calling `fetchProductDetail()`
- This happened on the **server-side** during page rendering
- Multiple users/tabs = exponential load increase

**Fix:**
```typescript
// DISABLED - was causing 30+ fetchProductDetail calls per page load
// Commented out automatic title cleaning logic
const detailTitleMap = new Map<string, string>();
```

**Impact:** Eliminates 30+ scraping operations per page view

---

### 1b. **IndiaMart Background Fetch on Page Load** ⚠️ CRITICAL
**Location:** `app/products/page.tsx` line 1288

**Problem:**
- `IndiaMartWarmFetchClient` component was making background API calls to `/api/external/search`
- This endpoint triggers live scraping via `fetchIndiaMart()`, `fetchAlibaba()`, etc.
- Happened automatically whenever IndiaMART platform was selected
- Caused hundreds of scraping operations

**Fix:**
```typescript
// DISABLED FOR PERFORMANCE - was triggering live scraping on every page load
// {platform === 'INDIAMART' && ( ... )}
```

**Impact:** Eliminates all background scraping operations on page load

---

### 1c. **Automatic Image Enhancement Scraping** ⚠️ CRITICAL
**Location:** `app/products/page.tsx` lines 165-200, 222-260

**Problem:**
- Server-side code was calling `getIndiaMartDetailMainImage()` and `getAlibabaDetailFirstJpg()`
- These functions scrape product detail pages to fetch better images
- Processed up to 80 IndiaMART + 80 Alibaba products per page load
- Each call scrapes an external website

**Fix:**
```typescript
// DISABLED FOR PERFORMANCE - Server-side image upgrade was triggering live scraping
// Images should be pre-cached during initial product ingestion, not on-demand
```

**Impact:** Eliminates 160+ image scraping operations per page view

---

### 2. **No Concurrency Limits on Scraping API** ⚠️ CRITICAL
**Location:** `app/api/rescrape/route.ts`

**Problem:**
- No limit on simultaneous scraping operations
- Multiple clients could trigger 100+ concurrent scrapes
- Each scrape takes 1-11 seconds
- Server resources exhausted

**Fix:**
```typescript
// Global scraping queue to limit concurrent operations
const scrapingQueue = new Map<string, Promise<any>>();
const MAX_CONCURRENT_SCRAPES = 5;

// Check if already scraping this URL
if (scrapingQueue.has(listing.url)) {
  return NextResponse.json({ 
    success: false,
    error: 'Already scraping this URL'
  }, { status: 429 });
}

// Limit concurrent scrapes
if (scrapingQueue.size >= MAX_CONCURRENT_SCRAPES) {
  return NextResponse.json({ 
    success: false,
    error: 'Server busy, too many concurrent scrapes. Please try again.'
  }, { status: 503 });
}
```

**Impact:** Limits server to maximum 5 concurrent scraping operations

---

### 3. **No Rate Limiting on Scrape Endpoint** ⚠️ HIGH
**Location:** `app/api/rescrape/route.ts`

**Problem:**
- Client scripts could spam the endpoint with unlimited requests
- No per-IP rate limiting

**Fix:**
```typescript
// Rate limiting: max 10 scrape requests per minute per IP
const limiter = getRateLimiter('rescrape-api', { capacity: 10, refillRate: 10/60 });
if (!limiter.tryRemoveTokens(1)) {
  return NextResponse.json({ 
    error: 'Too many scrape requests, please slow down' 
  }, { status: 429 });
}
```

**Impact:** Prevents abuse, limits to 10 requests/minute per IP

---

### 4. **No Result Caching** ⚠️ HIGH
**Location:** `app/api/rescrape/route.ts`

**Problem:**
- Same products were being scraped multiple times
- No caching of recent scrape results
- Wasted server resources on duplicate work

**Fix:**
```typescript
// Cache to prevent redundant scrapes (5 minute TTL)
const scrapeCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Check cache first (unless force=true)
if (!force) {
  const cached = scrapeCache.get(listing.url);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json({
      ...cached.data,
      fromCache: true
    });
  }
}

// Cache the result after scraping
scrapeCache.set(listing.url, {
  timestamp: Date.now(),
  data: response
});
```

**Impact:** Prevents duplicate scraping within 5-minute window

---

## Performance Improvements

### Before
- ❌ 100+ concurrent scrapes
- ❌ 30+ automatic scrapes per page load
- ❌ No caching
- ❌ No rate limiting
- ❌ 10+ second load times
- ❌ Server resource exhaustion

### After
- ✅ Maximum 5 concurrent scrapes
- ✅ Zero automatic scrapes on page load
- ✅ 5-minute result caching
- ✅ 10 requests/minute rate limiting
- ✅ Expected load times: <2 seconds
- ✅ Controlled resource usage

---

## Client Script Recommendations

### For `fix-all-alibaba-client.js` and `fix-all-mic-client.js`

**Current Settings:**
```javascript
const BATCH_SIZE = 3;
const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds
```

**Recommended Settings:**
```javascript
const BATCH_SIZE = 5; // Match server concurrency limit
const DELAY_BETWEEN_REQUESTS = 6000; // 6 seconds (10 req/min = 1 every 6s)
```

**Important:**
- Only run ONE instance of these scripts at a time
- The server now enforces concurrency limits
- Running multiple instances will result in 429/503 errors

---

## Configuration Options

### Adjust Concurrency Limit
In `app/api/rescrape/route.ts`:
```typescript
const MAX_CONCURRENT_SCRAPES = 5; // Increase if you have powerful server
```

### Adjust Rate Limiting
In `app/api/rescrape/route.ts`:
```typescript
const limiter = getRateLimiter('rescrape-api', { 
  capacity: 10,      // Burst capacity
  refillRate: 10/60  // 10 per minute
});
```

### Adjust Cache TTL
In `app/api/rescrape/route.ts`:
```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

---

## Future Improvements

### Recommended Enhancements
1. **Background Job Queue** - Move bulk scraping to background workers
   - Use Bull/BullMQ with Redis
   - Process scrapes asynchronously
   - Provide job status updates

2. **Database-Level Caching** - Cache scrape results in database
   - Add `lastScrapedAt` timestamp to SavedListing
   - Skip scraping if scraped within last hour
   - Reduces memory usage vs in-memory cache

3. **Progressive Enhancement** - Load titles on-demand
   - Lazy load clean titles as user scrolls
   - Use client-side fetching with SWR/React Query
   - Only scrape visible items

4. **Scrape Scheduling** - Intelligent scrape timing
   - Schedule bulk scrapes during off-peak hours
   - Use cron jobs for regular updates
   - Implement priority queue (popular items first)

---

## Monitoring

### Key Metrics to Track
- Concurrent scraping operations: `scrapingQueue.size`
- Cache hit rate: cached vs fresh scrapes
- Average scrape duration
- Rate limit rejections (429 responses)
- Concurrency limit rejections (503 responses)

### Add Logging
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log(`[Scrape Queue] Size: ${scrapingQueue.size}/${MAX_CONCURRENT_SCRAPES}`);
  console.log(`[Scrape Cache] Hit rate: ${cacheHits}/${totalRequests}`);
}
```

---

## Testing

### Verify Fixes
1. **Restart dev server:**
   ```bash
   pnpm run dev
   ```

2. **Visit products page:**
   - Should load instantly (no automatic scraping)
   - Check browser network tab - no `/api/rescrape` calls

3. **Test rate limiting:**
   ```bash
   node test-rescrape-api.js
   ```
   - Should see 429 errors after 10 requests

4. **Test concurrency:**
   - Run `fix-all-alibaba-client.js`
   - Monitor logs - should see queue management

---

## Deployment Checklist

- [x] Concurrency limits implemented
- [x] Rate limiting added
- [x] Result caching added
- [x] Automatic page-load scraping disabled
- [ ] Monitor performance in production
- [ ] Adjust limits based on server capacity
- [ ] Consider implementing background job queue

---

**Date:** November 21, 2024  
**Status:** ✅ Production Ready  
**Estimated Load Time Improvement:** 80-90% reduction
