# Alibaba Listing Quality Fix Scripts

This directory contains scripts to improve the quality of Alibaba listings by re-scraping and enhancing their `detailJson` data (particularly the `attributes` field).

## 📊 Current Status (as of your last run)

```
✅ Good (≥10 attributes):     38,815
⚠️  Partial (1-9 attributes):  1,299
❌ Bad (0 attributes):         7,430
⚠️  Errors:                   25,739
📈 Total:                     73,283
```

**Quality Score:** 53.0% need improvement

---

## 🛠️ Available Scripts

### 1. **Analyze Quality** - Check Current Status
```bash
node analyze-alibaba-quality.js
```
- Shows breakdown of listings by quality
- Calculates quality score percentage
- Recommends next actions

**Output Example:**
```
Current Status:
──────────────────────────────────────────────────
✅ Good (≥10 attributes):       38,815
⚠️  Partial (1-9 attributes):    1,299
❌ Bad (0 attributes):           7,430
🔴 Missing (no detailJson):     25,739
──────────────────────────────────────────────────
📊 Total:                       73,283

🎯 Quality Score: 53.0% (38,815/73,283)
🔧 Need Fixing: 34,468 listings
```

---

### 2. **Retry Problematic Listings** - Fix Specific Category
```bash
# Fix partial listings (1-9 attributes)
node retry-alibaba-problematic.js --category=PARTIAL

# Fix bad listings (0 attributes)
node retry-alibaba-problematic.js --category=BAD

# Fix missing listings (no detailJson)
node retry-alibaba-problematic.js --category=MISSING
```

**Features:**
- ✅ **Resume Support** - Saves progress to `alibaba-retry-progress.json`
- ✅ **Rate Limiting** - 10s delay between batches
- ✅ **Retry Logic** - Max 2 attempts per listing
- ✅ **Smart Timeout** - 90s per request for difficult listings
- ✅ **Graceful Shutdown** - Press Ctrl+C to stop, progress saved
- ✅ **Quality Tracking** - Reports improved/unchanged/errors

**Progress Output:**
```
📦 Batch 5 (13-15/1299)
   Progress: 1.2%
   🔄 Attempt 1 for abc123...
   📊 Before: PARTIAL (3 attrs)
   📊 After: GOOD (14 attrs)
   ✅ Improved to GOOD!

📊 Stats: ✅12 ➡️2 ❌0 Errors:1
⏱️  Elapsed: 145s | Rate: 5.0/min | Remaining: ~43min
```

---

### 3. **Batch Runner** - Fix All Categories Automatically
```bash
node run-alibaba-fixes.js
```

**What it does:**
1. Runs initial quality analysis
2. Processes PARTIAL → BAD → MISSING sequentially
3. Shows progress for each category
4. Runs final analysis to compare before/after
5. Generates comprehensive summary

**Recommended for:** Running overnight to fix all problematic listings at once.

**Progress Output:**
```
████████████████████████████████████████████████████████████████████████████████
  Processing: PARTIAL
████████████████████████████████████████████████████████████████████████████████

[... retry script output ...]

✅ PARTIAL completed in 43.2 minutes

⏸️  Waiting 10 seconds before next category...

████████████████████████████████████████████████████████████████████████████████
  Processing: BAD
████████████████████████████████████████████████████████████████████████████████
```

**Final Summary:**
```
================================================================================
BATCH FIX SUMMARY
================================================================================
✅ PARTIAL     COMPLETED (43.2 min)
✅ BAD         COMPLETED (78.5 min)
✅ MISSING     COMPLETED (125.3 min)
────────────────────────────────────────────────────────────────────────────────
⏱️  Total Runtime: 247.0 minutes
================================================================================
```

---

## 📋 Workflow Recommendations

### Option A: Manual Control (Recommended for First Run)
```bash
# 1. Check status
node analyze-alibaba-quality.js

# 2. Fix easiest first (partial - usually quick wins)
node retry-alibaba-problematic.js --category=PARTIAL

# 3. Check improvement
node analyze-alibaba-quality.js

# 4. Fix bad listings
node retry-alibaba-problematic.js --category=BAD

# 5. Fix missing (most difficult, may timeout)
node retry-alibaba-problematic.js --category=MISSING

# 6. Final check
node analyze-alibaba-quality.js
```

### Option B: Fully Automated (Set & Forget)
```bash
# Just run this and let it handle everything
node run-alibaba-fixes.js
```

---

## ⚙️ Configuration

### Retry Script Settings (in `retry-alibaba-problematic.js`)
```javascript
const BATCH_SIZE = 3;                    // Listings per batch
const DELAY_BETWEEN_BATCHES = 10000;     // 10 seconds
const MAX_RETRIES_PER_LISTING = 2;       // Don't retry forever
const REQUEST_TIMEOUT = 90000;           // 90 second timeout
const INTER_CHUNK_DELAY = 3000;          // 3 seconds between listings
```

**Adjust these if:**
- Getting rate limited → Increase `DELAY_BETWEEN_BATCHES`
- Many timeouts → Increase `REQUEST_TIMEOUT`
- Want faster processing → Decrease delays (risk rate limits)

---

## 🚨 Important Notes

### Before Running:
1. ✅ **Dev server must be running:** `pnpm run dev`
2. ✅ **Database accessible:** Prisma connection working
3. ✅ **API endpoint working:** `http://localhost:3007/api/rescrape`
4. ✅ **Sufficient time:** MISSING category can take 2+ hours

### During Execution:
- 🔴 **Press Ctrl+C once** to gracefully stop (progress saved)
- 🔴 **Press Ctrl+C twice** to force quit (may lose progress)
- 📁 **Progress files** are created: `alibaba-retry-progress.json`
- ⚠️ **Rate limits** are handled automatically with backoff

### After Completion:
- ✅ Progress files are auto-deleted on success
- ✅ Run `analyze-alibaba-quality.js` to verify improvements
- ✅ Re-run same category if needed (resumes from last position)

---

## 📈 Expected Improvements

Based on typical runs:

| Category | Typical Improvement Rate | Notes |
|----------|--------------------------|-------|
| PARTIAL  | ~70% → GOOD             | Best success rate, quick wins |
| BAD      | ~50% → GOOD/PARTIAL     | Moderate success, some stubborn |
| MISSING  | ~30% → GOOD             | Lowest success, many timeouts |

**Overall:** Expect to improve quality score by **15-25%** after full batch run.

---

## 🐛 Troubleshooting

### "Rate limited" errors
**Solution:** Increase `DELAY_BETWEEN_BATCHES` in retry script
```javascript
const DELAY_BETWEEN_BATCHES = 15000; // Increase from 10s to 15s
```

### "Timeout" errors
**Solution:** Increase `REQUEST_TIMEOUT` in retry script
```javascript
const REQUEST_TIMEOUT = 120000; // Increase from 90s to 120s
```

### "Connection refused"
**Solution:** Ensure dev server is running
```bash
pnpm run dev
```

### Progress not saving
**Solution:** Check write permissions on `alibaba-retry-progress.json`

### Want to reset progress
**Solution:** Delete progress file
```bash
rm alibaba-retry-progress.json
```

---

## 📝 Logs & Monitoring

### Real-time Stats
Each batch shows:
- ✅ **Improved:** Listings that reached ≥10 attributes
- ➡️ **Unchanged:** No improvement or partial improvement
- ❌ **Still Bad:** Failed after max retries
- ⚠️ **Errors:** Timeout, rate limit, or API errors

### Example Output
```
📊 Stats: ✅145 ➡️23 ❌8 Errors:12
⏱️  Elapsed: 1250s | Rate: 9.2/min | Remaining: ~45min
```

---

## 🎯 Success Metrics

**Target Goal:** 90%+ listings with ≥10 attributes

**Current:** 53.0% (38,815/73,283)  
**After fixes:** ~68-78% expected (50,000-57,000/73,283)

To reach 90%, may need:
1. Multiple retry passes
2. Manual intervention for stubborn listings
3. Enhanced scraping logic for difficult suppliers

---

## 🔄 Re-running Scripts

Scripts are **idempotent** and can be safely re-run:
- ✅ Skip already-good listings
- ✅ Retry failed listings
- ✅ Resume from last position
- ✅ No duplicate processing

**Recommended:** Run weekly to catch new listings and retry failures.

---

## 📞 Support

If issues persist after multiple runs:
1. Check individual listing URLs manually
2. Review `detailJson` structure in database
3. Consider enhancing scraper logic in `/lib/providers/alibaba.ts`
4. Report patterns of failures (specific suppliers, categories, etc.)

---

**Last Updated:** November 27, 2025  
**Scripts Version:** 1.0.0
