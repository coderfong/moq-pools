# Social Login - Quick Reference

## 🎯 What Was Done

### 1. Environment Variables Added to `.env`
```env
# OAuth Providers - Social Login
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

### 2. Files Modified

#### `app/login/page.tsx`
- Added `import { signIn } from "next-auth/react"`
- Connected social login buttons to NextAuth:
  - Google → `signIn('google', { callbackUrl: '/products' })`
  - Facebook → `signIn('facebook', { callbackUrl: '/products' })`
  - X/Twitter → `signIn('twitter', { callbackUrl: '/products' })`

#### `app/register/page.tsx`
- Added `import { signIn } from "next-auth/react"`
- Connected social login buttons (same as login page)

### 3. Already Configured (No Changes Needed)
✅ `auth.config.ts` - Already has Google, Facebook, Twitter providers
✅ `auth.ts` - Already set up with PrismaAdapter
✅ `src/components/Navbar.tsx` - Already has social login buttons
✅ Database schema - Already supports OAuth accounts
✅ All npm packages installed

## 🚀 Next Steps

1. **Get OAuth Credentials** (15-30 minutes)
   - [ ] Google: https://console.cloud.google.com/
   - [ ] Facebook: https://developers.facebook.com/
   - [ ] X/Twitter: https://developer.twitter.com/

2. **Update .env file** with your actual credentials

3. **Restart your dev server**
   ```bash
   pnpm dev
   ```

4. **Test each provider** at http://localhost:3000/login

## 📋 Callback URLs to Configure

### Development
- Google: `http://localhost:3000/api/auth/callback/google`
- Facebook: `http://localhost:3000/api/auth/callback/facebook`
- Twitter: `http://localhost:3000/api/auth/callback/twitter`

### Production (replace with your domain)
- Google: `https://yourdomain.com/api/auth/callback/google`
- Facebook: `https://yourdomain.com/api/auth/callback/facebook`
- Twitter: `https://yourdomain.com/api/auth/callback/twitter`

## 🔍 How It Works

1. User clicks a social login button
2. NextAuth redirects to provider's OAuth page
3. User authorizes the app
4. Provider redirects back to your callback URL
5. NextAuth creates/updates user account in database
6. User is redirected to `/products`

## 📖 Full Documentation

See `SOCIAL_LOGIN_SETUP.md` for detailed setup instructions and troubleshooting.
