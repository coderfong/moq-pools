# Setting Up Alibaba Official API

## Why Use the API?

The Alibaba API **completely bypasses anti-bot protection** because:
- ✅ No web scraping needed
- ✅ Official, authenticated access
- ✅ More reliable data
- ✅ No IP bans or CAPTCHAs
- ✅ Faster response times

## Setup Steps:

### 1. Get API Credentials

**For Alibaba.com (International):**
1. Go to: https://open.alibaba.com/
2. Register as a developer
3. Create a new application
4. Get your **App Key** and **App Secret**

**For 1688.com (China domestic):**
1. Go to: https://open.1688.com/
2. Follow the registration process
3. Create application and get credentials

### 2. Add Credentials to Environment

Create or update your `.env.local` file:

```bash
# Alibaba API Credentials
ALIBABA_APP_KEY=your_app_key_here
ALIBABA_APP_SECRET=your_app_secret_here
```

### 3. Test the Integration

```bash
# Test API connection
pnpm tsx scripts/testAlibabaApi.ts
```

### 4. Verify Products Fetch Correctly

Navigate to any pool page and click "Refresh details" - it should now use the API instead of scraping!

## API Endpoints Used:

1. **Product Details**: `alibaba.product.get`
   - Fetches full product information
   - Includes: title, prices, MOQ, attributes, images

2. **Product Search**: `alibaba.product.search` (future)
   - Search products by keywords
   - Get product listings

3. **Category Info**: `alibaba.category.get` (future)
   - Get category hierarchies
   - List products in categories

## Troubleshooting:

### "API credentials not configured"
- Make sure `.env.local` has both `ALIBABA_APP_KEY` and `ALIBABA_APP_SECRET`
- Restart your dev server after adding credentials

### "API request failed: 401"
- Your App Key or App Secret is incorrect
- Regenerate credentials from Alibaba Developer Portal

### "API request failed: 403"
- Your app may not have permission for this API
- Check your app's API permissions in the developer portal

### Still getting scraped data (anti-bot errors)
- API fetch is failing, check console for error messages
- Verify credentials are correct
- Check if API has rate limits

## Alternative: Using the JAR File

If you prefer to use the Java JAR (`1.0.4-1690374097817bk5i.jar`):

### Option A: Create Node.js Java Bridge

```bash
# Install java bridge
pnpm add java
```

Then create a wrapper service that calls Java methods from Node.js.

### Option B: Create Standalone Java Service

```bash
# Run Java HTTP server using the JAR
java -jar 1.0.4-1690374097817bk5i.jar --port 3001
```

Then call it from Node.js:
```typescript
const response = await fetch('http://localhost:3001/api/product?id=123');
```

## Next Steps:

1. ✅ **Get your API credentials** from Alibaba Developer Portal
2. ✅ **Add them to `.env.local`**
3. ✅ **Test with the provided script**
4. ✅ **Enjoy scrape-free, reliable product data!**

---

**Questions?** Check:
- Alibaba Open Platform Docs: https://open.alibaba.com/docs
- 1688 Open Platform Docs: https://open.1688.com/doc/
