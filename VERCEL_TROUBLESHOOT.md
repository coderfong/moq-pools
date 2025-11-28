# Vercel Deployment Troubleshooting

## 🔍 Troubleshooting Steps

### 1. Check Build Logs
1. Go to your Vercel dashboard
2. Click on your deployment
3. Check the "Building" logs for errors

### 2. Verify Environment Variables
Add these to your Vercel project settings:

**Required Variables:**
```bash
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your-32-char-secret
APP_BASE_URL=https://your-app.vercel.app
```

**Optional but Recommended:**
```bash
STRIPE_SECRET_KEY=sk_test_or_live_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
CRON_SECRET=your-cron-secret
```

### 3. Quick Fix Commands

**Test build locally:**
```bash
pnpm build
```

**Generate Prisma client:**
```bash
npx prisma generate
```

### 4. Common Solutions

**Problem: Build fails with Prisma errors**
- Ensure DATABASE_URL is set in Vercel environment variables
- Add build command: `npx prisma generate && next build`

**Problem: 404 on all routes**
- Check if build completed successfully
- Verify app/page.tsx exists (✅ it does)
- Check for TypeScript/ESLint errors

**Problem: Database connection fails**
- Verify DATABASE_URL format
- Ensure database is accessible from Vercel's network

### 5. Vercel Build Command Override
If needed, set custom build command in Vercel:
```bash
npx prisma generate && pnpm build
```

### 6. Quick Test
Create a simple test page to verify deployment:
```typescript
// app/test/page.tsx
export default function TestPage() {
  return <div>Deployment Working! ✅</div>
}
```

## 🚀 Redeploy Steps
1. Check environment variables are set
2. Trigger new deployment
3. Monitor build logs
4. Test at https://your-app.vercel.app/test