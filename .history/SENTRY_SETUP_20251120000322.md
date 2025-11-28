# Sentry Setup Guide

Sentry is now configured for error tracking and performance monitoring in your application.

## 🚀 Quick Setup (5 minutes)

### 1. Create Sentry Account
1. Go to [sentry.io](https://sentry.io/signup/)
2. Sign up with GitHub (recommended) or email
3. Create a new project:
   - Platform: **Next.js**
   - Project name: `moq-pools` (or your preference)

### 2. Get Your DSN
After creating the project:
1. Go to **Settings** → **Client Keys (DSN)**
2. Copy the **DSN** (looks like: `https://abc123@o0.ingest.sentry.io/456789`)

### 3. Configure Environment Variables
Add to your `.env` file:

```bash
# Uncomment and replace with your actual Sentry DSN
SENTRY_DSN=https://YOUR_KEY@o0.ingest.sentry.io/YOUR_PROJECT_ID
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@o0.ingest.sentry.io/YOUR_PROJECT_ID

# For source map uploads (get from Settings → Auth Tokens)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=moq-pools
SENTRY_AUTH_TOKEN=your_auth_token_here
```

### 4. Get Auth Token (for source map uploads)
1. Go to **Settings** → **Auth Tokens**
2. Click **Create New Token**
3. Name: `moq-pools-sourcemaps`
4. Scopes: Select **project:read** and **project:releases**
5. Copy the token and add to `.env`

### 5. Test It Works
Restart your dev server:
```bash
pnpm dev
```

Then trigger a test error in your browser console:
```javascript
throw new Error("Sentry test error");
```

Check your Sentry dashboard - the error should appear within seconds!

## 📊 What Sentry Tracks

### Automatic Error Tracking
- ✅ Unhandled exceptions
- ✅ Promise rejections
- ✅ API route errors
- ✅ Server-side rendering errors
- ✅ Edge function errors

### Performance Monitoring
- ✅ Page load times
- ✅ API response times
- ✅ Database query performance
- ✅ Custom transactions

### Session Replay (10% sample rate)
- ✅ Visual recording of user sessions when errors occur
- ✅ Console logs and network requests
- ✅ User interactions leading to errors

## 🎯 Production Configuration

### In Vercel/Railway
Add these environment variables:

```bash
SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=moq-pools
SENTRY_AUTH_TOKEN=your-token
```

### Sample Rates for Production
Edit `sentry.client.config.ts` and `sentry.server.config.ts`:

```typescript
// Lower trace sample rate in production to reduce costs
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

// Session replay only for errors in production
replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
```

## 🔧 Advanced Features

### Custom Error Context
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({ id: userId, email: userEmail });
Sentry.setTag('feature', 'payment');
Sentry.setContext('order', { orderId, amount });
```

### Manual Error Capture
```typescript
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error, {
    level: 'error',
    tags: { section: 'checkout' },
  });
}
```

### Performance Tracking
```typescript
const transaction = Sentry.startTransaction({
  name: 'Scrape Alibaba Listing',
  op: 'scraping',
});

// ... do work ...

transaction.finish();
```

## 📈 Monitoring Your Application

### Key Metrics to Watch
1. **Error Rate** - Should be <1% of requests
2. **Response Time** - API routes <500ms, pages <2s
3. **Apdex Score** - User satisfaction metric
4. **Most Common Errors** - Fix highest frequency issues first

### Alert Setup
1. Go to **Alerts** → **Create Alert**
2. Recommended alerts:
   - Error spike (>10 errors in 5 minutes)
   - Slow transaction (>2s response time)
   - Failed health check

### Performance Insights
- View slowest transactions
- Identify N+1 database queries
- Track API endpoint performance
- Monitor external service calls

## 🚨 Troubleshooting

### Errors Not Appearing?
1. Check DSN is correct in `.env`
2. Restart dev server after adding DSN
3. Verify Sentry is initialized (check browser console for Sentry logs with `debug: true`)
4. Check network tab for requests to `ingest.sentry.io`

### Source Maps Not Uploading?
1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check auth token has `project:releases` scope
3. Build the app once to trigger upload: `pnpm build`
4. Check build logs for Sentry plugin output

### Too Many Events?
1. Lower sample rates in config files
2. Add filters to ignore known errors
3. Use rate limiting in Sentry project settings

## 💰 Pricing
- **Free Tier**: 5,000 errors + 10,000 performance events per month
- **Team Plan**: $26/month for 50K errors
- **Recommended**: Start with free tier, upgrade if needed

## 🔗 Resources
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)

---

## ✅ Configuration Complete!

Your application is now set up with Sentry. Simply add your DSN to start tracking errors and performance in production! 🎉
