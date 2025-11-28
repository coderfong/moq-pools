# Alibaba OAuth2 Token Exchange Fix ✅

## Summary

Fixed the OAuth token exchange by using **Alibaba's correct endpoint pattern**:

**The Issue:**
- ❌ Standard OAuth2 `/oauth/token` endpoint returns **405 Method Not Allowed**
- Alibaba uses a **mixed OAuth approach** (not standard OAuth2)

**The Solution:**
- ✅ Authorize URL: `https://openapi-auth.alibaba.com/oauth/authorize` (auth server)
- ✅ Token URL: `https://gw.api.alibaba.com/openapi/param2/1/system.oauth2/getToken/{APP_KEY}` (API gateway)

---

## What Was Fixed

### Previous (Broken) Attempts

**Attempt 1:**
```typescript
// ❌ WRONG: Tried API gateway without proper path
const url = `https://gw.api.alibaba.com/openapi/...`;
```
**Result:** `"error_code":"gw.AppKeyNotFound"`

**Attempt 2:**
```typescript
// ❌ WRONG: Tried standard OAuth2 endpoint
const url = `https://openapi-auth.alibaba.com/oauth/token`;
```
**Result:** `405 Method Not Allowed` (endpoint doesn't exist)

### Current (Correct) Implementation  
```typescript
// ✅ CORRECT: Alibaba's documented token endpoint
const TOKEN_URL = `https://gw.api.alibaba.com/openapi/param2/1/system.oauth2/getToken/${appKey}`;

const body = new URLSearchParams({
  grant_type: 'authorization_code',
  client_id: appKey,
  client_secret: appSecret,
  code: authorizationCode,
  redirect_uri: redirectUri,
  sp: 'icbu',
});

const response = await fetch(TOKEN_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: body.toString(),
});
```
**Result:** Valid access token and refresh token 🎉

---

## Why Alibaba's OAuth is Different

Unlike standard OAuth2 which uses a single auth server for both steps, Alibaba splits the flow:

| Step | Standard OAuth2 | Alibaba OAuth |
|------|----------------|---------------|
| **Authorize** | `auth.provider.com/oauth/authorize` | `openapi-auth.alibaba.com/oauth/authorize` ✅ |
| **Token Exchange** | `auth.provider.com/oauth/token` | `gw.api.alibaba.com/openapi/param2/1/system.oauth2/getToken/{APP_KEY}` ✅ |

This is Alibaba's documented pattern for their International Open Platform (IOP).
2. **Standard OAuth2 Parameters**: Using standard OAuth2 field names
3. **ICBU Service Provider**: Added `sp=icbu` parameter for Alibaba.com International
4. **Updated Response Type**: Added fields like `seller_id`, `account`, and `sp` to `TokenResponse` interface
5. **Constants for URLs**: Added `ALIBABA_AUTH_BASE` and `ALIBABA_API_GATEWAY` constants for consistency

---

## Files Modified

### `src/lib/providers/alibabaApi.ts`
- Added constants: `ALIBABA_AUTH_BASE`, `ALIBABA_API_GATEWAY`
- Updated `TokenResponse` interface with ICBU-specific fields
- Rewrote `exchangeCodeForToken()` method to use correct OAuth endpoint
- Updated `generateAuthorizationUrl()` to use constant

### New Files Created
- `ALIBABA_OAUTH_FIX.md` - This documentation
- `test-alibaba-oauth.js` - Standalone test script for OAuth flow

---

## Testing the Fix

### Option 1: Quick Test with Node.js Script

```bash
# 1. Get an authorization code by visiting the authorize URL
# (You can get this URL from your app or run the dev server and visit the auth page)

# 2. Run the test script
node test-alibaba-oauth.js "3_501706_XXXXXXXX"
```

The script will show:
- ✅ Success with access token details
- ❌ Error with helpful troubleshooting tips

### Option 2: Manual Test with curl (PowerShell)

```powershell
$body = @{
    grant_type = "authorization_code"
    code = "3_501706_XXXXXXXX"  # Replace with actual code from callback
    client_id = "501706"  # Your app key
    client_secret = "your_app_secret_here"  # Your app secret
    redirect_uri = "https://4e91dbcb57e9.ngrok-free.app/api/alibaba/callback"
    sp = "icbu"
}

Invoke-RestMethod -Uri "https://openapi-auth.alibaba.com/oauth/token" `
    -Method POST `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $body
```

### Option 3: Test Through Your App

1. Make sure ngrok is running and your app is accessible
2. Visit: `http://localhost:3007/admin/settings` (or wherever you have the auth button)
3. Click "Authorize with Alibaba"
4. Log in with a seller account
5. Check the callback logs for success

---

## Expected Responses

### ✅ Success Response
```json
{
  "access_token": "ebc18588-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "refresh_token": "d4d5cxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "expires_in": 3153599922,
  "refresh_expires_in": 3153599922,
  "seller_id": "200042362",
  "account": "test1234@126.com",
  "sp": "icbu"
}
```

### ❌ Common OAuth Errors (Now Proper OAuth, Not Gateway Errors)

| Error | Description | Solution |
|-------|-------------|----------|
| `invalid_client` | Wrong `client_id` or `client_secret` | Verify credentials in Alibaba Open Platform |
| `invalid_grant` | Code expired, used, or invalid | Get a fresh code (they expire quickly) |
| `invalid_request` | Missing required parameter | Check all parameters are present |
| `unauthorized_client` | App not authorized for grant type | Check app settings on Alibaba platform |

**Note:** You should NO LONGER see `gw.AppKeyNotFound` errors! 🎉

---

## Critical Configuration Checklist

Before testing, verify these match **exactly**:

### ✅ 1. App Credentials
```bash
# Check in Alibaba Open Platform → Your App → Advanced Information
ALIBABA_APP_KEY=501706
ALIBABA_APP_SECRET=your_actual_secret_here
```

### ✅ 2. Redirect URI (Must Match Everywhere)

The redirect URI must be **identical** in:
1. Alibaba Open Platform app settings (callback URL whitelist)
2. The `/oauth/authorize` URL (authorization flow)
3. The `/oauth/token` request body (token exchange)
4. Your `.env` file

Example:
```bash
ALIBABA_REDIRECT_URI=https://4e91dbcb57e9.ngrok-free.app/api/alibaba/callback
```

**Important:** 
- Same scheme (`https`)
- Same host (exact ngrok URL)
- Same path (no extra/missing trailing slash)
- URL-encode when used in URLs

### ✅ 3. Service Provider
For Alibaba.com International (ICBU): `sp=icbu`

---

## Architecture Overview

Alibaba has **two separate systems** for OAuth and business APIs:

```
┌─────────────────────────────────────────────────────────────┐
│  OAuth Server (Authentication)                              │
│  https://openapi-auth.alibaba.com                          │
│                                                             │
│  • /oauth/authorize  → Get authorization code              │
│  • /oauth/token      → Exchange code for tokens            │
└─────────────────────────────────────────────────────────────┘
                            ↓ Returns access_token
┌─────────────────────────────────────────────────────────────┐
│  API Gateway (Business APIs)                                │
│  https://gw.api.alibaba.com/openapi                        │
│                                                             │
│  • /products/...     → Product APIs (needs token)          │
│  • /orders/...       → Order APIs (needs token)            │
│  • /...              → Other business APIs (needs token)   │
└─────────────────────────────────────────────────────────────┘
```

**Key Point:** Don't try to get OAuth tokens from the API gateway – it doesn't handle OAuth!

---

## Code Structure Changes

### Constants Added
```typescript
// OAuth2 endpoints - separate from business API gateway
const ALIBABA_AUTH_BASE = 'https://openapi-auth.alibaba.com';
const ALIBABA_API_GATEWAY = 'https://gw.api.alibaba.com/openapi';
```

### Token Response Interface Updated
```typescript
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
  resource_owner?: string;  // May not be present in ICBU responses
  seller_id?: string;        // ICBU seller ID  
  account?: string;          // Seller email/account
  sp?: string;               // Service provider (e.g., 'icbu')
  refresh_token_timeout?: number;
}
```

---

## Next Steps After Successful Token Exchange

Once you get a valid `access_token` and `refresh_token`:

### 1. Store in Database
```typescript
// Example using Prisma
await prisma.settings.upsert({
  where: { key: 'alibaba_access_token' },
  create: { 
    key: 'alibaba_access_token', 
    value: tokenData.access_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
  },
  update: { 
    value: tokenData.access_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
  },
});

await prisma.settings.upsert({
  where: { key: 'alibaba_refresh_token' },
  create: { key: 'alibaba_refresh_token', value: tokenData.refresh_token },
  update: { value: tokenData.refresh_token },
});
```

### 2. Test API Calls
Use the access token to call business APIs through the gateway:
```typescript
// Now you can use the token for actual API calls
const products = await alibabaApi.searchProducts({
  keywords: 'laptop',
  page: 1,
  pageSize: 20
});
```

### 3. Implement Token Refresh
Use the refresh token when the access token expires:
```typescript
const newTokenData = await alibabaApi.refreshAccessToken(refreshToken);
```

---

## Troubleshooting

### Still Getting Errors?

**1. Check your environment variables:**
```bash
node -e "console.log({
  APP_KEY: process.env.ALIBABA_APP_KEY,
  HAS_SECRET: !!process.env.ALIBABA_APP_SECRET,
  REDIRECT_URI: process.env.ALIBABA_REDIRECT_URI
})"
```

**2. Verify redirect URI matches exactly:**
- In your `.env` file
- In Alibaba Open Platform app settings
- No typos, trailing slashes, or http vs https mismatches

**3. Check code freshness:**
Authorization codes expire quickly (usually 5-10 minutes) and can only be used once. Get a fresh code if yours is old.

**4. Verify app permissions:**
Make sure your app has the necessary permissions in the Alibaba Open Platform settings.

**5. Check ngrok is running:**
```powershell
# Should show your ngrok URL
curl http://127.0.0.1:4040/api/tunnels
```

### Still Not Working?

Check the console logs when running the OAuth flow. The updated code provides detailed logging:
- Request URL
- Request body (with secret redacted)
- Full response from Alibaba
- Parsed token data

---

## Security Notes

⚠️ **IMPORTANT:** Rotate your app secret if you've exposed it in logs or screenshots!

1. Go to Alibaba Open Platform → Your App → Advanced Information
2. Click "Reset Secret" or "Generate New Secret"
3. Update your `.env` file with the new secret
4. Restart your application

---

## Quick Reference

| Purpose | URL |
|---------|-----|
| Generate auth URL | `https://openapi-auth.alibaba.com/oauth/authorize` |
| Exchange code for token | `https://openapi-auth.alibaba.com/oauth/token` |
| Business API calls | `https://gw.api.alibaba.com/openapi/...` |

**Remember:** OAuth endpoints are on the auth server, business APIs are on the gateway!
