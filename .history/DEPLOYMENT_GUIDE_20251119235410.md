# Production Deployment Guide

## 🎯 Pre-Deployment Checklist

### ✅ Completed Production Fixes
- [x] Database indexes for performance (267K+ listings)
- [x] Health check API endpoint (`/api/health`)
- [x] Security headers in Next.js config
- [x] Environment variables template (`.env.example`)
- [x] `.env` protected in `.gitignore`

### ⚠️ Before Going Live

#### 1. Environment Variables
Copy `.env.example` to `.env` on your hosting platform and configure:

```bash
# CRITICAL: Update these with production values
DATABASE_URL=postgresql://...  # Railway PostgreSQL connection
STRIPE_SECRET_KEY=sk_live_...  # Use LIVE keys, not test
SESSION_SECRET=...              # Generate with: openssl rand -hex 32
SMTP_PASS=...                   # Gmail App Password
```

#### 2. Database Migration
Run migrations on production database:
```bash
pnpm prisma migrate deploy
```

#### 3. Build Test
Ensure the app builds successfully:
```bash
pnpm build
```

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Pros:**
- Zero-config Next.js deployment
- Automatic HTTPS and CDN
- Edge functions for API routes
- Free hobby tier available

**Steps:**
1. Push code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables from `.env.example`
4. Deploy

**Environment Variables to Add:**
```
DATABASE_URL
APP_BASE_URL (https://your-domain.vercel.app)
STRIPE_SECRET_KEY (use sk_live_...)
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
TURNSTILE_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
SESSION_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
SCRAPE_HEADLESS=1
```

**Post-Deployment:**
- Configure custom domain (optional)
- Update Stripe webhook URL to `https://your-domain.vercel.app/api/webhooks/stripe`
- Update `APP_BASE_URL` environment variable

### Option 2: Railway (Unified Stack)

**Pros:**
- Database and app on same platform
- Simple deployment from GitHub
- Good for monolithic setups

**Steps:**
1. Create new project on [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables
4. Deploy

### Option 3: Self-Hosted (VPS/Docker)

**Steps:**
1. Build the application:
   ```bash
   pnpm build
   ```

2. Start production server:
   ```bash
   pnpm start
   ```

3. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start npm --name "moq-pools" -- start
   pm2 save
   pm2 startup
   ```

4. Configure Nginx reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3007;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T...",
  "uptime": 123.456,
  "database": {
    "status": "connected",
    "responseTime": 45
  },
  "version": "0.3.0"
}
```

### 2. Database Connection
Check Prisma Studio:
```bash
pnpm prisma studio
```

### 3. Security Headers
Test with: https://securityheaders.com/

Expected headers:
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Strict-Transport-Security
- ✅ Referrer-Policy

### 4. Stripe Integration
- Test payment flow with test cards
- Verify webhook receives events
- Check Stripe dashboard for logs

### 5. Email Verification
- Register test account
- Verify email delivery
- Check SMTP logs if issues

## 📊 Monitoring Setup

### Application Monitoring

#### Option 1: Sentry (Recommended)
1. Sign up at [sentry.io](https://sentry.io)
2. Install Sentry:
   ```bash
   pnpm add @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. Add to `.env`:
   ```
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

#### Option 2: LogRocket
Session replay + error tracking

#### Option 3: Better Stack (formerly Logtail)
Log aggregation and monitoring

### Database Monitoring
- Railway provides built-in metrics
- Consider adding Prisma Pulse for real-time updates
- Set up connection pool monitoring

### Uptime Monitoring
Free options:
- [UptimeRobot](https://uptimerobot.com) - Monitor `/api/health` every 5 minutes
- [Pingdom](https://www.pingdom.com) - Free tier available
- [StatusCake](https://www.statuscake.com) - Free forever plan

## 🔐 Security Checklist

- [ ] All environment variables are set and secure
- [ ] Stripe using LIVE keys (not test keys)
- [ ] SESSION_SECRET is randomly generated (32+ characters)
- [ ] SMTP credentials use App Password (not account password)
- [ ] Database has strong password
- [ ] `.env` is not committed to git
- [ ] HTTPS enabled on production domain
- [ ] Cloudflare Turnstile configured for production domain
- [ ] Security headers verified with securityheaders.com
- [ ] Rate limiting tested on API endpoints

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Test connection
pnpm prisma db pull
```

If fails:
- Check `DATABASE_URL` format
- Verify Railway database is running
- Check IP whitelist (Railway usually allows all)

### Build Failures
```bash
# Check TypeScript errors
pnpm typecheck

# Check ESLint
pnpm lint
```

Note: Project has `ignoreBuildErrors: true` for faster iteration

### Image Loading Issues
- Verify `next.config.mjs` has correct CDN domains
- Check network tab for blocked requests
- Ensure external domains allow hotlinking

### Stripe Webhook Issues
1. Check webhook secret matches Stripe dashboard
2. Verify endpoint URL: `https://your-domain.com/api/webhooks/stripe`
3. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3007/api/webhooks/stripe
   ```

## 📈 Performance Optimization

### Already Implemented
- ✅ Database indexes on high-traffic tables
- ✅ Prisma connection pooling
- ✅ Next.js automatic code splitting
- ✅ Image optimization via Next/Image

### Recommended Additions
1. **Redis Caching** - For rate limiting and session storage
2. **CDN** - Vercel Edge Network (automatic) or Cloudflare
3. **Database Read Replicas** - For 267K+ listings
4. **Image CDN** - Consider Cloudinary or ImgIX for `/cache/` images

## 🎯 Next Steps After Deployment

1. **Set up monitoring alerts** - Get notified of errors/downtime
2. **Configure backup strategy** - Database dumps, automated backups
3. **Document API endpoints** - For future integrations
4. **Set up staging environment** - Test before production
5. **Create runbook** - Common issues and solutions
6. **Load testing** - Ensure app handles expected traffic

## 📞 Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **Railway Docs**: https://docs.railway.app
- **Stripe Docs**: https://stripe.com/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

## 🎉 You're Ready for Production!

Your application now has:
- ✅ Optimized database performance (indexed queries)
- ✅ Health monitoring endpoint
- ✅ Production security headers
- ✅ Comprehensive environment configuration
- ✅ Complete deployment documentation

**Final check before launch:**
```bash
curl https://your-domain.com/api/health
```

If you get `"status": "healthy"`, you're good to go! 🚀
