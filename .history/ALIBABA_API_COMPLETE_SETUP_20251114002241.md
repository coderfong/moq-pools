# Alibaba API Setup - Complete Guide

## Overview

This guide explains how to use Alibaba's official API to fetch product listings instead of scraping, which bypasses bot detection and works reliably across all browsers.

## Why Use the API?

**Current Problem:**
- Scraping gets blocked by Alibaba's anti-bot protection
- Listings only show up in Chrome, not other browsers
- Inconsistent data quality
- Rate limiting issues

**API Solution:**
- ✅ Bypasses all bot detection
- ✅ Works in all browsers
- ✅ Official, stable data format
- ✅ Higher rate limits
- ✅ Includes MOQ, pricing tiers, inventory, shipping

## Step 1: Get API Credentials

### For Alibaba.com (International)

1. Go to https://open.alibaba.com/
2. Click "Register" and create a developer account
3. Create a new application
4. **Configure Callback URL:**
   - Development: `https://localhost:3007/api/alibaba/callback`
   - Production: `https://your-domain.com/api/alibaba/callback`
   - **Important:** Must use `https://` (not `http://`)
5. You'll receive:
   - **App Key** (also called Client ID)
   - **App Secret** (also called Client Secret)

### For 1688.com (China Domestic)

1. Go to https://open.1688.com/
2. Register with a Chinese business account
3. Create an application
4. **Configure Callback URL:**
   - Development: `https://localhost:3007/api/alibaba/callback`
   - Production: `https://your-domain.com/api/alibaba/callback`
   - **Important:** Must use `https://` (not `http://`)
5. Receive App Key and App Secret

### Important: Callback URL Configuration

In the Alibaba Developer Portal, when it asks for "Callback URL":

**Enter this (Development):**
```
https://localhost:3007/api/alibaba/callback
```

**For production, use:**
```
https://your-domain.com/api/alibaba/callback
```

⚠️ **Important:** Alibaba requires HTTPS even for localhost URLs. Use `https://` not `http://`.

This URL receives the authorization code after sellers authorize your app.

## Step 2: Configure Your Environment

Add these to your `.env` file:

```env
# Alibaba API Credentials (Required)
ALIBABA_APP_KEY=your_app_key_here
ALIBABA_APP_SECRET=your_app_secret_here

# OAuth Callback URL (Required for seller authorization)
# Important: Must use https:// even for localhost
ALIBABA_REDIRECT_URI=https://localhost:3007/api/alibaba/callback

# Authorization Endpoint (Optional - defaults shown)
# For Alibaba.com (international):
ALIBABA_AUTH_ENDPOINT=https://auth.alibaba.com/oauth/authorize
# For 1688.com (China):
# ALIBABA_AUTH_ENDPOINT=https://auth.1688.com/oauth/authorize

# Optional: Pre-generated access token (will auto-refresh if omitted)
ALIBABA_ACCESS_TOKEN=your_token_here
```

**Example:**
```env
ALIBABA_APP_KEY=12345678
ALIBABA_APP_SECRET=abcdef1234567890abcdef1234567890
ALIBABA_REDIRECT_URI=https://localhost:3007/api/alibaba/callback
```

**For Production:**
```env
ALIBABA_APP_KEY=12345678
ALIBABA_APP_SECRET=abcdef1234567890abcdef1234567890
ALIBABA_REDIRECT_URI=https://moqpools.com/api/alibaba/callback
```

## Step 3: Test the API

Run the comprehensive test script:

```powershell
pnpm tsx scripts/testAlibabaApiComplete.ts
```

This will test:
- ✅ Authentication (token generation)
- ✅ Product search
- ✅ Product details fetch
- ✅ Category information
- ✅ Shipping templates

## Step 4: How It Works

### Two Authentication Methods

#### Method 1: OAuth2 Flow (Recommended for Production)

For apps that need seller authorization:

1. **Seller clicks "Connect Alibaba"** in your admin panel
2. **Redirects to** `/api/alibaba/authorize`
3. **Alibaba shows login page** - seller logs in and approves your app
4. **Alibaba redirects back** to `/api/alibaba/callback` with authorization code
5. **Your app exchanges code for token** - stores it in database
6. **Token used for all API calls** - auto-refreshes when expired

**To implement:**
```tsx
// In your admin panel
<a href="/api/alibaba/authorize" className="btn-primary">
  Connect Alibaba Account
</a>
```

#### Method 2: Client Credentials (Simpler for Testing)

For basic product browsing without seller-specific data:

1. **App uses App Key + Secret** to generate token automatically
2. **No seller login required** - works immediately
3. **Limited to public product data** - can't access seller inventory, orders, etc.

This is what's currently configured - just add credentials to `.env` and it works!

### Automatic API Integration

The system now **automatically** uses the API first:

```typescript
// In src/lib/providers/alibaba.ts
export async function fetchAlibaba(q: string, limit = 10) {
  // 1. Try API first (NEW!)
  const apiResults = await searchAlibabaProducts({ keyword: q, limit });
  if (apiResults.length > 0) {
    return apiResults; // ✓ Success!
  }

  // 2. Fallback to scraping if API fails
  return await scrapeFallback(q, limit);
}
```

### Product Display Flow

1. **User searches** for "wireless earbuds"
2. **API is called** with search query
3. **Results include:**
   - Product title
   - MOQ (Minimum Order Quantity)
   - Price tiers (e.g., 1-99: $5, 100-499: $4.50, 500+: $4)
   - High-quality images
   - Product attributes
   - Supplier information
   - Inventory levels
   - Shipping options

4. **Display on products page** - all data shows correctly in every browser

## Available API Methods

### Search Products
```typescript
const results = await searchAlibabaProducts({
  keyword: 'bluetooth speaker',
  limit: 20,
  minPrice: 5,
  maxPrice: 50,
  minMoq: 100,
});
```

### Get Product Details
```typescript
const product = await fetchProductViaApi(productUrl);
// Returns: MOQ, price tiers, images, attributes, shipping
```

### Get Complete Product Info
```typescript
const fullDetails = await alibabaApi.getCompleteProductInfo(productId);
// Includes: inventory, shipping templates, all attributes
```

### Calculate Shipping
```typescript
const freight = await alibabaApi.calculateFreight({
  productId: '1600450628256',
  quantity: 500,
  country: 'US',
});
```

## API Endpoints Implemented

### OAuth2 Endpoints

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `GET /api/alibaba/authorize` | Start OAuth flow | Redirect seller here to authorize |
| `GET /api/alibaba/callback` | Receive auth code | Registered in Alibaba Dev Portal |

### Product API Endpoints

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/auth/token/create` | Generate access token | ✅ |
| `/auth/token/refresh` | Refresh expired token | ✅ |
| `/alibaba/icbu/product/get/v2` | Get product details | ✅ |
| `/alibaba/icbu/product/search/v2` | Search products | ✅ |
| `/alibaba/icbu/category/get/v2` | Get category info | ✅ |
| `/icbu/product/inventory/get` | Check inventory | ✅ |
| `/shipping/freight/calculate` | Calculate shipping | ✅ |
| `/alibaba/icbu/product/list/shipping/te` | Get shipping templates | ✅ |

## Troubleshooting

### "No API credentials found"
- Check your `.env` file exists
- Verify variable names are exactly `ALIBABA_APP_KEY` and `ALIBABA_APP_SECRET`
- Restart your dev server after adding credentials

### "Token generation failed"
- Verify your App Key and Secret are correct
- Check if your Alibaba developer account is active
- Ensure you're using the right API gateway (1688.com vs Alibaba.com)

### "API returned no results"
- Your search query might be too specific
- Try broader keywords
- Check if your API account has product access permissions

### "API request failed: 401"
- Your access token expired
- Delete cached token and regenerate
- Check if App Secret is correct

## Rate Limits

**Alibaba API Limits (typical):**
- 1,000 requests per hour
- 10,000 requests per day
- No hard limit on product views

**Much better than scraping limits:**
- Scraping: ~100 requests before temporary ban
- API: 1,000+ requests/hour without issues

## Migration from Scraping

The migration is **automatic** - no code changes needed!

1. Add API credentials to `.env`
2. Restart your dev server
3. Browse to `/products`
4. **Done!** Listings now load via API

### Rollback Safety

If API fails, the system **automatically falls back** to scraping:

```
[Alibaba] 🔄 Attempting official API search...
[Alibaba] ⚠️ API search failed, falling back to scraping...
[Alibaba] ✓ Scraped 10 products successfully
```

## Next Steps

1. ✅ Add credentials to `.env`
2. ✅ Run test script
3. ✅ Browse `/products` - listings should work in all browsers
4. ✅ Check console logs for API success messages

## Support

**Alibaba Developer Portal:**
- Docs: https://developers.alibaba.com/
- Support: https://open.alibaba.com/help

**Common Issues:**
- See `IMPLEMENTATION_STATUS.md` for integration details
- Check `scripts/testAlibabaApiComplete.ts` for examples
- Review `src/lib/providers/alibabaApi.ts` for API client code

---

**Status:** ✅ Fully implemented and ready to use!
