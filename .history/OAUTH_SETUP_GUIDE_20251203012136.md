# OAuth Setup Guide

Complete guide to setting up Google, Facebook, and X (Twitter) authentication for MOQ Pools.

---

## Prerequisites

1. Add these environment variables to your `.env` file (copy from `.env.example`)
2. Generate AUTH_SECRET: Run `openssl rand -hex 32` in terminal

---

## 1. Google OAuth Setup

### Step 1: Access Google Cloud Console
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create a new project or select an existing one

### Step 2: Enable Required APIs
1. Go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Google+ API** (or People API)
   - **Google Identity Services**

### Step 3: Create OAuth Client ID
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Configure OAuth consent screen if prompted:
   - User Type: **External** (for testing)
   - App name: **MOQ Pools**
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `email` and `profile`
   - Test users: Add your email for testing

4. Application type: **Web application**
5. Name: **MOQ Pools**
6. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://www.moqpools.com
   ```
7. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://www.moqpools.com/api/auth/callback/google
   ```
8. Click **CREATE**
9. Copy **Client ID** and **Client Secret** to your `.env`:
   ```env
   GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
   ```

### Testing Google Login
- Test users must be added in OAuth consent screen during development
- Once verified, you can publish the app for public use

---

## 2. Facebook OAuth Setup

### Step 1: Access Facebook Developers
- Go to [Facebook Developers](https://developers.facebook.com/apps)
- Click **Create App**

### Step 2: Create App
1. Use case: **Authenticate and request data from users with Facebook Login**
2. App type: **Consumer**
3. App name: **MOQ Pools**
4. Contact email: Your email
5. Click **Create App**

### Step 3: Add Facebook Login
1. In dashboard, find **Facebook Login** product
2. Click **Set Up**
3. Platform: **Web**
4. Site URL: `https://www.moqpools.com` (or your domain)

### Step 4: Configure OAuth Settings
1. Go to **Facebook Login** > **Settings** (left sidebar)
2. Add **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/facebook
   https://www.moqpools.com/api/auth/callback/facebook
   ```
3. Save changes

### Step 5: Get Credentials
1. Go to **Settings** > **Basic**
2. Copy **App ID** and **App Secret**:
   ```env
   FACEBOOK_CLIENT_ID=1234567890123456
   FACEBOOK_CLIENT_SECRET=abcdef1234567890abcdef1234567890
   ```

### Step 6: Make App Public (for production)
1. In **App Review**, submit for review
2. Or keep in **Development Mode** and add test users in **Roles** > **Test Users**

### Testing Facebook Login
- Add test users in **Roles** > **Test Users** during development
- Switch to **Live Mode** once app is reviewed and approved

---

## 3. X (Twitter) OAuth Setup

### Step 1: Access Twitter Developer Portal
- Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- Sign in and apply for a developer account if needed (usually instant approval)

### Step 2: Create Project and App
1. Click **+ Create Project**
2. Project name: **MOQ Pools**
3. Use case: **Making a bot**
4. Description: User authentication for pool ordering platform
5. Click **Next**

6. App name: **MOQ Pools Auth**
7. Click **Complete**

### Step 3: Enable OAuth 2.0
1. In your app dashboard, go to **Settings** tab
2. Scroll to **User authentication settings**
3. Click **Set up**

4. Configure OAuth 2.0:
   - App permissions: **Read**
   - Type of App: **Web App**
   - App info:
     - Callback URI / Redirect URL:
       ```
       http://localhost:3000/api/auth/callback/twitter
       https://www.moqpools.com/api/auth/callback/twitter
       ```
     - Website URL: `https://www.moqpools.com`
     - Organization name: **MOQ Pools**
     - Organization website: `https://www.moqpools.com`
     - Terms of service: `https://www.moqpools.com/terms`
     - Privacy policy: `https://www.moqpools.com/privacy`

5. Click **Save**

### Step 4: Get OAuth 2.0 Credentials
1. After setup, you'll see **OAuth 2.0 Client ID** and **Client Secret**
2. **IMPORTANT**: Copy the Client Secret immediately (shown only once)
3. If you lose it, regenerate in **Keys and tokens** tab

Add to `.env`:
```env
TWITTER_CLIENT_ID=abcdefghijklmnopqrstuvwxyz123456
TWITTER_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop
```

### Common Issues
- Make sure you're using **OAuth 2.0** credentials (not OAuth 1.0a API keys)
- Client Secret must be from OAuth 2.0 section, not Bearer Token
- All redirect URIs must exactly match (including http/https)

---

## 4. Complete .env Configuration

Your `.env` file should now have all these variables:

```env
# Generate with: openssl rand -hex 32
AUTH_SECRET=your-generated-32-char-secret
NEXTAUTH_SECRET=your-generated-32-char-secret

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop

# Facebook OAuth
FACEBOOK_CLIENT_ID=1234567890123456
FACEBOOK_CLIENT_SECRET=abcdef1234567890abcdef1234567890

# Twitter/X OAuth (OAuth 2.0)
TWITTER_CLIENT_ID=abcdefghijklmnopqrstuvwxyz123456
TWITTER_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop
```

---

## 5. Testing Authentication

### Local Testing (Development)
1. Start your dev server: `pnpm dev`
2. Go to `http://localhost:3000/login`
3. Click on Google/Facebook/X buttons
4. Should redirect to provider and back to `/products`

### Common Issues & Solutions

**"Redirect URI mismatch"**
- Double-check redirect URIs exactly match in provider dashboard
- Include both `http://localhost:3000` and production URLs
- Don't forget `/api/auth/callback/[provider]` path

**"App not verified" warning (Google)**
- Normal during development
- Add test users in OAuth consent screen
- Submit for verification before public launch

**"Error 400: redirect_uri_mismatch"**
- Redirect URI in provider console must exactly match
- Check for trailing slashes, http vs https
- Make sure callback path is correct: `/api/auth/callback/google`

**Facebook "App Not Set Up"**
- Make sure Facebook Login product is added
- Check Valid OAuth Redirect URIs are saved
- Verify app is in Development or Live mode

**Twitter "Unauthorized"**
- Ensure you're using OAuth 2.0 credentials (not 1.0a)
- Client Secret must be from OAuth 2.0 section
- Callback URL must be exact match

---

## 6. Account Linking

The current configuration uses `allowDangerousEmailAccountLinking: true`, which means:
- If a user signs up with email, then later uses Google OAuth with the same email, the accounts will be linked automatically
- This is convenient but slightly less secure
- Remove this option if you want stricter account separation

---

## 7. Production Deployment

Before going live:

### Google
1. Publish OAuth consent screen
2. Submit for verification (shows verified badge)
3. Add production redirect URI

### Facebook
1. Submit app for **App Review**
2. Request **email** and **public_profile** permissions
3. Switch from Development to Live mode
4. Add all production redirect URIs

### Twitter/X
1. Verify all production callback URIs are added
2. No special approval needed for basic authentication
3. Test with multiple accounts

### Security Checklist
- [ ] AUTH_SECRET is strong random string (32+ chars)
- [ ] All environment variables are in `.env` (not committed to git)
- [ ] Production redirect URIs use HTTPS only
- [ ] Test all three OAuth providers work
- [ ] Verify email account linking works as expected
- [ ] Check that logout works properly

---

## 8. Monitoring & Maintenance

### Google Cloud Console
- Monitor API usage in **APIs & Services** > **Dashboard**
- Check for quota limits
- Review OAuth consent screen status

### Facebook Developers
- Check **Analytics** for login usage
- Monitor error logs in **Webhooks**
- Keep app in Live mode for public access

### Twitter Developer Portal
- Monitor rate limits in dashboard
- Check authentication metrics
- Review any policy compliance issues

---

## Troubleshooting Commands

Generate new AUTH_SECRET:
```bash
openssl rand -hex 32
```

Test environment variables are loaded:
```bash
node -e "console.log(process.env.GOOGLE_CLIENT_ID)"
```

Clear Next.js cache:
```bash
rm -rf .next
pnpm dev
```

---

## Need Help?

- **NextAuth.js Docs**: https://next-auth.js.org/providers/
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Facebook Login Docs**: https://developers.facebook.com/docs/facebook-login
- **Twitter OAuth 2.0 Docs**: https://developer.twitter.com/en/docs/authentication/oauth-2-0

---

**Last Updated**: December 3, 2025
