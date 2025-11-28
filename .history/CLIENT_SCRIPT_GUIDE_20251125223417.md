# Client Script Usage Guide

## ⚠️ IMPORTANT CHANGES

The `/api/rescrape` endpoint now has performance controls to prevent server overload:

### New Limits
- **Rate Limit:** 10 requests per minute per IP
- **Concurrency:** Maximum 5 simultaneous scraping operations
- **Cache:** 5-minute TTL (duplicate requests return cached results)

---

## Updated Script Configuration

### For `fix-all-alibaba-client.js`

**Recommended Settings:**
```javascript
const BATCH_SIZE = 5; // Match server concurrency
const DELAY_BETWEEN_REQUESTS = 7000; // 7 seconds (8.5 req/min, under 10/min limit)
const DELAY_BETWEEN_BATCHES = 10000; // 10 seconds between batches
```

### For `fix-all-mic-client.js`

**Recommended Settings:**
```javascript
const BATCH_SIZE = 5; // Match server concurrency
const DELAY_BETWEEN_REQUESTS = 7000; // 7 seconds
const DELAY_BETWEEN_BATCHES = 10000; // 10 seconds
```

---

## Common Error Responses

### 429 - Rate Limit Exceeded
```json
{
  "error": "Too many scrape requests, please slow down"
}
```
**Solution:** Wait 60 seconds, then resume

### 429 - Already Scraping
```json
{
  "success": false,
  "error": "Already scraping this URL",
  "listingId": "..."
}
```
**Solution:** Skip this item (already being processed)

### 503 - Server Busy
```json
{
  "success": false,
  "error": "Server busy, too many concurrent scrapes. Please try again.",
  "queueSize": 5
}
```
**Solution:** Wait 10 seconds, then retry

---

## Best Practices

### ✅ DO
- Run only ONE instance of scraping scripts at a time
- Use recommended delay settings
- Handle 429/503 errors gracefully
- Monitor console output for queue status

### ❌ DON'T
- Run multiple scraping scripts simultaneously
- Lower delays below 7 seconds
- Ignore rate limit errors
- Run scripts while users are actively browsing

---

## Handling Errors in Your Scripts

### Recommended Error Handling

```javascript
async function scrapeWithRetry(listingId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId })
      });

      // Handle rate limiting
      if (response.status === 429) {
        const data = await response.json();
        
        // Check if it's already being scraped
        if (data.error?.includes('Already scraping')) {
          console.log('⏭️  Skipping - already being processed');
          return { skipped: true };
        }
        
        // Rate limit - wait and retry
        console.log('⏸️  Rate limited, waiting 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }

      // Handle server busy
      if (response.status === 503) {
        console.log(`⏸️  Server busy (attempt ${attempt}/${maxRetries}), waiting 10s...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      // Success
      if (response.ok) {
        const data = await response.json();
        return data;
      }

      // Other errors
      console.log(`❌ HTTP ${response.status}`);
      return { error: true, status: response.status };

    } catch (err) {
      console.log(`❌ Request failed: ${err.message}`);
      if (attempt === maxRetries) return { error: true };
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return { error: true, message: 'Max retries exceeded' };
}
```

---

## Monitoring Performance

### Check Queue Status
The server now logs queue information:
```
[Scrape Queue] Size: 5/5 (at capacity)
[Scrape Cache] Hit rate: 45/100 (45% cached)
```

### Expected Behavior
- **First request:** Full scrape (1-5 seconds)
- **Duplicate within 5 min:** Instant cached response
- **Concurrent requests:** Queued or rejected with 429/503

---

## Optimal Scraping Schedule

### Low-Traffic Hours
Run bulk scraping scripts during off-peak times:
- Late night (2 AM - 6 AM)
- Early morning (6 AM - 8 AM)

### Peak Hours
Avoid running scripts during:
- Business hours (9 AM - 5 PM)
- Evening (6 PM - 10 PM)

### Manual Scraping
Individual product re-scrapes via API are fine anytime:
```bash
curl -X POST http://localhost:3007/api/rescrape \
  -H "Content-Type: application/json" \
  -d '{"listingId": "your-listing-id"}'
```

---

## Troubleshooting

### "Too many requests" errors
- Increase `DELAY_BETWEEN_REQUESTS` to 10 seconds
- Reduce `BATCH_SIZE` to 3
- Wait 60 seconds for rate limit to reset

### "Server busy" errors
- Another script/user is scraping
- Wait for queue to clear
- Consider scheduling for off-peak hours

### Slow scraping
- This is intentional to prevent server overload
- Expected rate: 8-10 products per minute
- For 1000 products: ~2 hours (acceptable for bulk operations)

### Cached results when you want fresh data
- Add `force: true` to request body:
  ```javascript
  body: JSON.stringify({ listingId, force: true })
  ```

---

## Production Deployment Notes

When deploying to production:

1. **Adjust concurrency** based on server capacity:
   ```typescript
   // In app/api/rescrape/route.ts
   const MAX_CONCURRENT_SCRAPES = 10; // Increase for powerful servers
   ```

2. **Adjust rate limiting** for production load:
   ```typescript
   const limiter = getRateLimiter('rescrape-api', { 
     capacity: 20,      // Higher burst capacity
     refillRate: 20/60  // 20 per minute
   });
   ```

3. **Consider Redis caching** instead of in-memory:
   - Survives server restarts
   - Shared across multiple instances
   - Better for horizontal scaling

4. **Implement background job queue**:
   - Use Bull/BullMQ with Redis
   - Process scrapes asynchronously
   - Better user experience

---

**Last Updated:** November 21, 2024  
**Related:** PERFORMANCE_FIXES.md
