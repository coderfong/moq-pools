# 🌐 B2B Platform API Guide

## Platforms You're Currently Using

Based on your codebase, you're scraping from these platforms:

1. ✅ **Alibaba.com** (International) - `ALIBABA`
2. ✅ **1688.com** (China Domestic) - `C1688`
3. ⚠️ **Made-in-China.com** - `MADE_IN_CHINA`
4. ⚠️ **IndiaMART** - `INDIAMART`
5. ⚠️ **Global Sources** - `GLOBAL_SOURCES`

---

## 1. ✅ Alibaba.com / 1688.com - **HAS OFFICIAL API**

### Status: ✅ **IMPLEMENTED** (just needs credentials)

**API Availability:** YES - Alibaba Open Platform
- **International (Alibaba.com):** https://open.alibaba.com/
- **China Domestic (1688.com):** https://open.1688.com/

**What You Get:**
- ✅ Product details (title, price, MOQ, attributes, images)
- ✅ Product search by keyword
- ✅ Category browsing
- ✅ Supplier information
- ✅ Price tiers and bulk pricing
- ✅ No anti-bot blocking!

**Current Status:**
- ✅ API client fully implemented: `src/lib/providers/alibabaApi.ts`
- ✅ Integrated into detail fetcher as priority method
- ⏳ **Waiting for credentials** (you need to register)

**Setup:**
```bash
# 1. Register at https://open.alibaba.com/ or https://open.1688.com/
# 2. Create application, get App Key & App Secret
# 3. Add to .env.local:
ALIBABA_APP_KEY=your_app_key_here
ALIBABA_APP_SECRET=your_app_secret_here

# 4. Test:
pnpm tsx scripts/testAlibabaApi.ts
```

**Rate Limits:**
- Free Tier: ~100-1,000 requests/day (varies by endpoint)
- Paid Plans: Higher limits available

**Documentation:**
- https://open.alibaba.com/docs
- https://open.1688.com/doc/

---

## 2. ⚠️ Made-in-China.com - **NO PUBLIC API**

### Status: ❌ **NO OFFICIAL API AVAILABLE**

**API Availability:** NO - No public API program

**Current Implementation:**
- Scraping via `fetchMICDetail()` in `src/lib/providers/detail.ts`
- Uses `fetchHtml()` - regular HTTP requests

**Anti-Bot Status:**
- Medium protection (less aggressive than Alibaba)
- May face rate limiting during high-volume scraping

**Alternatives:**
1. **Continue web scraping** (current approach)
   - Add delays between requests
   - Rotate user agents
   - Use headless browser for complex pages
   
2. **Contact Made-in-China directly** for partnership/API access
   - Some B2B platforms offer private APIs to verified partners
   - Email: service@made-in-china.com

3. **Use data aggregators** (expensive, but comprehensive)
   - TradeIndia API (aggregates multiple platforms)
   - ScrapeHero Cloud (managed scraping service)

**Recommendation:**
- Continue with current scraping approach
- Add rate limiting: max 10 requests/minute
- Implement caching (you already cache in database)
- Monitor for anti-bot changes

---

## 3. ⚠️ IndiaMART - **LIMITED API**

### Status: ⚠️ **HAS API BUT LIMITED TO SUPPLIERS**

**API Availability:** YES - But restrictive

**IndiaMART Developer API:**
- **URL:** https://www.indiamart.com/api-documentation/
- **Access:** Only for **registered suppliers** on their platform
- **Purpose:** For suppliers to manage their own listings

**What You Get (if you're a supplier):**
- ✅ Manage your own product listings
- ✅ Get buyer inquiries
- ✅ Update catalog
- ❌ **Cannot search other sellers' products**
- ❌ **Cannot get product details from competitors**

**Alternative: IndiaMART Buy Leads API**
- Allows getting buyer requirements (RFQs)
- Not useful for product sourcing

**Current Implementation:**
- Scraping via `fetchIndiaMartDetail()` in `src/lib/providers/detail.ts`
- Multiple helper scripts: `backfillIndiaMartImages.ts`, etc.

**Anti-Bot Status:**
- Low to medium protection
- Has faced some blocking in your scripts (see `backfillIndiaMartBadImages.ts`)

**Recommendation:**
- **Continue web scraping** - no better alternative available
- IndiaMART API won't help for sourcing products from other suppliers
- Add delays and caching (you already have extensive caching)
- Consider headless browser for difficult pages

---

## 4. ⚠️ Global Sources - **NO PUBLIC API**

### Status: ❌ **NO OFFICIAL API AVAILABLE**

**API Availability:** NO - No developer program

**Current Implementation:**
- Scraping via scripts (see `buildGlobalSourcesSeedJobs.ts`)
- Platform: `GLOBAL_SOURCES` in your schema

**Anti-Bot Status:**
- Unknown - depends on their current protection level
- Likely similar to Made-in-China

**Alternatives:**
1. **Contact Global Sources for partnership**
   - They may offer private API access to verified partners
   - Email: inquiry@globalsources.com

2. **Continue web scraping with precautions:**
   - Respect robots.txt
   - Add delays (1-2 seconds between requests)
   - Use session management
   - Rotate IPs if needed (residential proxies)

**Recommendation:**
- Continue current scraping approach
- Monitor for blocking and adjust as needed
- Consider reaching out for partnership/API access

---

## 📊 Summary Table

| Platform | Official API? | Access Type | Priority | Notes |
|----------|---------------|-------------|----------|-------|
| **Alibaba.com** | ✅ YES | Public (with registration) | 🔥 **HIGH** | Already implemented! Just need credentials |
| **1688.com** | ✅ YES | Public (with registration) | 🔥 **HIGH** | Same API as Alibaba, already implemented |
| **Made-in-China** | ❌ NO | N/A | 🟡 Low | Continue scraping |
| **IndiaMART** | ⚠️ LIMITED | Supplier-only | 🟡 Low | API exists but not useful for sourcing |
| **Global Sources** | ❌ NO | N/A | 🟡 Low | Continue scraping |

---

## 🎯 Recommended Action Plan

### **Priority 1: Alibaba/1688 API** 🔥
**Timeline: This week**
1. Register at https://open.alibaba.com/
2. Get App Key & App Secret
3. Add to `.env.local`
4. Test with `pnpm tsx scripts/testAlibabaApi.ts`
5. **Result:** 80%+ of your scraping issues solved!

### **Priority 2: Optimize Other Platforms**
**Timeline: Next sprint**

For Made-in-China, IndiaMART, Global Sources:
1. Add rate limiting to prevent IP bans
2. Implement retry logic with exponential backoff
3. Use headless browser for stubborn pages
4. Set up proxy rotation if needed

### **Priority 3: Contact Platforms for Partnership**
**Timeline: Long-term**

If you scale significantly:
1. Contact Made-in-China for private API access
2. Contact Global Sources for partnership
3. Become IndiaMART supplier to access their API (if needed)

---

## 🛠️ Implementation Recommendations

### Add Rate Limiting (For non-API platforms)

```typescript
// Create src/lib/rateLimit.ts
export class RateLimiter {
  private queue: Map<string, number[]> = new Map();
  
  async throttle(key: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const requests = this.queue.get(key) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    recentRequests.push(now);
    this.queue.set(key, recentRequests);
  }
}

// Usage:
const limiter = new RateLimiter();
await limiter.throttle('made-in-china', 10, 60000); // 10 req/min
```

### Add Proxy Rotation (If needed)

```bash
# Install proxy services (optional)
pnpm add proxy-chain axios-proxy-fix

# Or use free proxy lists
# https://www.proxynova.com/proxy-server-list/
```

### Monitor Anti-Bot Detection

```typescript
// Add to fetchHtml in detail.ts
const ANTI_BOT_INDICATORS = [
  /captcha/i,
  /cloudflare/i,
  /access denied/i,
  /unusual traffic/i,
];

function detectAntiBot(html: string): boolean {
  return ANTI_BOT_INDICATORS.some(pattern => pattern.test(html));
}
```

---

## 🎁 Bonus: Other B2B Platform APIs

If you want to expand to other platforms:

### **TradeIndia API** ✅
- **URL:** https://www.tradeindia.com/api/
- **Access:** Public (with registration)
- **Features:** Product search, supplier info
- **Cost:** Paid plans only

### **AliExpress API** ✅
- **URL:** https://open.aliexpress.com/
- **Access:** Public (with registration)
- **Features:** Product search, dropshipping integration
- **Note:** More retail-focused, but has API

### **DHgate API** ❌
- No official public API
- Would require scraping

### **EC21 API** ❌
- No official public API
- Would require scraping

---

## 📚 Additional Resources

- **Alibaba Open Platform Docs:** https://open.alibaba.com/docs
- **1688 Open Platform:** https://open.1688.com/doc/
- **IndiaMART API Docs:** https://www.indiamart.com/api-documentation/
- **Web Scraping Best Practices:** https://www.scrapehero.com/web-scraping-best-practices/

---

## ❓ Questions to Consider

1. **What's your scraping volume per platform?**
   - This determines if you need API vs scraping is sustainable

2. **Are you planning to become a supplier on any platform?**
   - If yes, you can access supplier APIs (IndiaMART, etc.)

3. **Budget for APIs?**
   - Alibaba API is free for moderate use
   - TradeIndia and others have paid plans

4. **Legal considerations?**
   - Check each platform's Terms of Service for scraping policies
   - APIs are always legally safer than scraping

---

**Next Steps:** Focus on getting Alibaba API credentials first - this will solve your immediate anti-bot issues for the majority of your data sources! 🚀
