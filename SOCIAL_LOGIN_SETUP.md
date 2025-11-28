# Social Login Setup Guide

This guide will help you configure Google, Facebook, and X (Twitter) OAuth authentication for your application.

## ✅ What's Already Configured

Your application is already set up with:
- ✓ NextAuth.js with Google, Facebook, and Twitter providers
- ✓ Social login buttons on login and register pages
- ✓ Automatic account linking for users with the same email
- ✓ Environment variables placeholders in `.env`

## 🔧 Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: MOQ Pools
   - User support email: your email
   - Developer contact: your email
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret**
9. Update your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   ```

### 2. Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Choose app type: **Consumer** or **Business**
4. Fill in app details:
   - App name: MOQ Pools
   - Contact email: your email
5. In the dashboard, click **Set Up** under **Facebook Login**
6. Choose **Web** platform
7. Add your site URL: `http://localhost:3000` (for development)
8. Go to **Settings** > **Basic** to get your App ID and App Secret
9. Go to **Facebook Login** > **Settings**
10. Add Valid OAuth Redirect URIs:
    - Development: `http://localhost:3000/api/auth/callback/facebook`
    - Production: `https://yourdomain.com/api/auth/callback/facebook`
11. Update your `.env` file:
    ```env
    FACEBOOK_CLIENT_ID=your-facebook-app-id
    FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
    ```

### 3. X (Twitter) OAuth 2.0 Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project if you don't have one
3. Create a new app within your project
4. Go to your app's settings
5. Enable **OAuth 2.0**
6. Set up OAuth 2.0 settings:
   - Type of App: Web App
   - Callback URI / Redirect URL:
     - Development: `http://localhost:3000/api/auth/callback/twitter`
     - Production: `https://yourdomain.com/api/auth/callback/twitter`
   - Website URL: Your website URL
7. Go to **Keys and tokens** tab
8. Under **OAuth 2.0 Client ID and Client Secret**, click **Generate**
9. Copy the **Client ID** and **Client Secret** (save the secret immediately, it won't be shown again)
10. Update your `.env` file:
    ```env
    TWITTER_CLIENT_ID=your-twitter-client-id
    TWITTER_CLIENT_SECRET=your-twitter-client-secret
    ```

## 🔐 Security Notes

1. **Never commit your `.env` file** - It should be in your `.gitignore`
2. **Use environment variables** for production deployment (Vercel, Railway, etc.)
3. **Keep secrets secure** - Don't share them in public repositories
4. **Rotate secrets regularly** - Change them periodically for security

## 🧪 Testing

### Local Testing

1. Ensure all OAuth credentials are in your `.env` file
2. Restart your development server:
   ```bash
   pnpm dev
   ```
3. Navigate to `http://localhost:3000/login`
4. Test each social login button
5. Verify you're redirected back to `/products` after successful login

### Common Issues

**"Invalid redirect URI"**
- Make sure your callback URLs exactly match what's in the provider settings
- Include `http://` or `https://` in the URL
- Don't include trailing slashes

**"App not verified" (Google)**
- This is normal during development
- Click "Advanced" > "Go to [App Name] (unsafe)" to proceed
- For production, submit your app for verification

**"App in Development Mode" (Facebook)**
- Add test users in Facebook App settings
- Or switch app to "Live" mode (requires business verification)

**Twitter OAuth errors**
- Ensure you're using OAuth 2.0 (not 1.0a)
- Check that your app has the correct permissions

## 🚀 Production Deployment

When deploying to production:

1. Update callback URLs in each provider to use your production domain
2. Set environment variables in your hosting platform:
   - Vercel: Project Settings > Environment Variables
   - Railway: Variables tab
   - Netlify: Site settings > Environment variables

3. Ensure `AUTH_SECRET` is set to a secure random string:
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

## 📝 Database Schema

Your database should already have the necessary tables from the Prisma schema:
- `User` - Stores user account information
- `Account` - Stores OAuth account linkings
- `Session` - Manages user sessions

The `allowDangerousEmailAccountLinking: true` setting in `auth.config.ts` allows users to link multiple OAuth providers to the same account if they share an email address.

## 🎨 Customization

### Changing Callback URLs

To redirect users to a different page after login, modify the `callbackUrl` in:
- `app/login/page.tsx`
- `app/register/page.tsx`
- `src/components/Navbar.tsx`

Example:
```typescript
signIn('google', { callbackUrl: '/dashboard' })
```

### Adding More Providers

NextAuth supports many providers. To add more:

1. Install the provider if needed
2. Add to `auth.config.ts`:
   ```typescript
   import GitHub from 'next-auth/providers/github';
   
   providers: [
     GitHub({
       clientId: process.env.GITHUB_CLIENT_ID,
       clientSecret: process.env.GITHUB_CLIENT_SECRET,
     }),
     // ... other providers
   ]
   ```
3. Add environment variables
4. Add button to your UI

## 📚 Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
- [Twitter OAuth 2.0](https://developer.twitter.com/en/docs/authentication/oauth-2-0)

## ✨ Features Included

- ✅ Social login on login and register pages
- ✅ Social login in navigation bar
- ✅ Automatic account creation for new users
- ✅ Account linking for existing users with same email
- ✅ Session management with JWT
- ✅ Redirect to products page after successful login
- ✅ Error handling for failed logins
- ✅ Support for both credentials and OAuth authentication

Your social login is ready to use once you configure the OAuth credentials!
