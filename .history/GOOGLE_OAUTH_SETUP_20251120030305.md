# Google OAuth Setup - Step by Step

## 📋 Prerequisites
- A Google account
- Your application running locally or deployed

## 🚀 Step-by-Step Instructions

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project
1. Click the project dropdown at the top of the page (next to "Google Cloud")
2. Click **"NEW PROJECT"** in the top right
3. Enter project details:
   - **Project name**: `MOQ Pools` (or any name you prefer)
   - **Organization**: Leave as default (No organization)
4. Click **"CREATE"**
5. Wait for the project to be created, then select it from the project dropdown

### Step 3: Configure OAuth Consent Screen
Before creating credentials, you need to set up the OAuth consent screen:

1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** user type (unless you have a Google Workspace)
3. Click **"CREATE"**

4. **Fill in OAuth consent screen (Page 1 - App information)**:
   - **App name**: `MOQ Pools`
   - **User support email**: Select your email from dropdown
   - **App logo**: (Optional) You can upload your logo later
   - **Application home page**: `http://localhost:3000` (for now)
   - **Authorized domains**: Leave empty for development
   - **Developer contact information**: Enter your email address
   - Click **"SAVE AND CONTINUE"**

5. **Scopes (Page 2)**:
   - Click **"ADD OR REMOVE SCOPES"**
   - Check these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**

6. **Test users (Page 3)**:
   - Click **"ADD USERS"**
   - Add your email address(es) for testing
   - Click **"ADD"**
   - Click **"SAVE AND CONTINUE"**

7. **Summary (Page 4)**:
   - Review your settings
   - Click **"BACK TO DASHBOARD"**

### Step 4: Create OAuth Client ID

1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**

4. **Configure OAuth client**:
   - **Application type**: Select **"Web application"**
   - **Name**: `MOQ Pools Web Client` (or any descriptive name)
   
5. **Authorized JavaScript origins** (optional for now):
   - Click **"+ ADD URI"**
   - Add: `http://localhost:3000`
   - Click **"+ ADD URI"** again
   - Add: `http://127.0.0.1:3000`

6. **Authorized redirect URIs** (IMPORTANT!):
   - Click **"+ ADD URI"**
   - Add: `http://localhost:3000/api/auth/callback/google`
   - Click **"+ ADD URI"** again (for production)
   - Add: `https://yourdomain.com/api/auth/callback/google` (replace with your actual domain when ready)

7. Click **"CREATE"**

### Step 5: Copy Your Credentials

A dialog will appear with your credentials:

1. **Copy the Client ID** - It looks like: `123456789-abc123xyz.apps.googleusercontent.com`
2. **Copy the Client Secret** - It looks like: `GOCSPX-abc123xyz...`

⚠️ **IMPORTANT**: Keep these credentials secure! Never commit them to Git.

### Step 6: Add to Your .env File

Open your `.env` file and replace the placeholder values:

```env
GOOGLE_CLIENT_ID=123456789-abc123xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz...
```

Save the file.

### Step 7: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C in the terminal)
# Then restart it:
pnpm dev
```

### Step 8: Test the Login

1. Open your browser to `http://localhost:3000/login`
2. Click the **Google** button
3. You should be redirected to Google's login page
4. Sign in with your Google account
5. You'll be asked to authorize the app
6. After authorization, you should be redirected back to your app at `/products`

## 🐛 Troubleshooting

### "Error 400: redirect_uri_mismatch"
**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**:
1. Check that you added `http://localhost:3000/api/auth/callback/google` exactly (no trailing slash)
2. Make sure you selected the correct project in Google Cloud Console
3. Wait a few minutes for changes to propagate

### "Access blocked: This app's request is invalid"
**Problem**: OAuth consent screen not properly configured.

**Solution**:
1. Go back to "OAuth consent screen" in Google Cloud Console
2. Make sure you added test users (your email)
3. Verify all required fields are filled in

### "Error 401: invalid_client"
**Problem**: Client ID or Secret is incorrect.

**Solution**:
1. Double-check you copied the full Client ID and Secret
2. Make sure there are no extra spaces in your `.env` file
3. Restart your dev server after updating `.env`

### "This app isn't verified"
**Problem**: Your app is in testing mode (normal for development).

**Solution**:
1. Click **"Advanced"**
2. Click **"Go to MOQ Pools (unsafe)"**
3. This is expected during development
4. For production, you'll need to submit for verification (or keep it in testing with approved test users)

## 📱 Production Setup

When you're ready to deploy:

1. **Update Authorized redirect URIs** in Google Cloud Console:
   - Add your production URL: `https://yourdomain.com/api/auth/callback/google`

2. **Update Authorized JavaScript origins**:
   - Add: `https://yourdomain.com`

3. **Publishing your app**:
   - By default, your app is in "Testing" mode (limited to test users)
   - To allow anyone to sign in, go to "OAuth consent screen" → **"PUBLISH APP"**
   - Google may require verification if you request sensitive scopes

4. **Set environment variables** on your hosting platform:
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your production environment variables

## 🔐 Security Best Practices

1. ✅ Never commit `.env` to Git (already in `.gitignore`)
2. ✅ Use different OAuth clients for development and production
3. ✅ Regularly rotate your client secrets
4. ✅ Monitor your OAuth usage in Google Cloud Console
5. ✅ Only request the scopes you actually need

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Need help?** Check the main `SOCIAL_LOGIN_SETUP.md` file for more information about all OAuth providers.
