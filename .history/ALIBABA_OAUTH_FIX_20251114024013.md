# Alibaba OAuth2 Token Exchange Fix

## What Was Fixed

The token exchange was incorrectly calling the **API gateway** (`https://gw.api.alibaba.com/openapi/...`) instead of the **OAuth server** (`https://openapi-auth.alibaba.com/oauth/token`).

### Key Changes

1. **Correct Token Endpoint**: Now using `https://openapi-auth.alibaba.com/oauth/token`
2. **Standard OAuth2 Parameters**: Using standard OAuth2 field names
3. **ICBU Service Provider**: Added `sp=icbu` parameter for Alibaba.com International
4. **Updated Response Type**: Added fields like `seller_id`, `account`, and `sp` to `TokenResponse`

## Testing the Fix

### 1. Manual Test with curl

First, get an authorization code by visiting the authorize URL (get this from your app or logs), then use curl to test the token exchange:

```bash
# Replace these values with your actual credentials
export ALIBABA_CODE="3_501706_XXXXXXXX"  # From callback URL
export ALIBABA_APP_KEY="501706"
export ALIBABA_APP_SECRET="your_app_secret_here"
export ALIBABA_REDIRECT_URI="https://4e91dbcb57e9.ngrok-free.app/api/alibaba/callback"

curl -X POST "https://openapi-auth.alibaba.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=$ALIBABA_CODE" \
  -d "client_id=$ALIBABA_APP_KEY" \
  -d "client_secret=$ALIBABA_APP_SECRET" \
  -d "redirect_uri=$ALIBABA_REDIRECT_URI" \
  -d "sp=icbu"
```

### PowerShell Version (for Windows)

```powershell
$body = @{
    grant_type = "authorization_code"
    code = "3_501706_XXXXXXXX"  # Replace with actual code
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

### Expected Success Response

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

### Possible OAuth Errors

If you get an error, it will be a proper OAuth2 error (not `gw.AppKeyNotFound`):

- `invalid_client`: Wrong `client_id` or `client_secret`
- `invalid_grant`: Code expired, already used, or invalid
- `invalid_request`: Missing required parameter
- `unauthorized_client`: App not authorized for this grant type

## Critical Configuration Checklist

Before testing, verify these three values match **exactly**:

### ✅ 1. App Credentials
- `client_id` = Your AppKey (e.g., `501706`)
- `client_secret` = Your App Secret from Alibaba Open Platform
- Check in: https://open.alibaba.com → Your App → Advanced Information

### ✅ 2. Redirect URI
Must be **identical** in:
- Alibaba Open Platform app settings
- The `/oauth/authorize` URL (when redirecting users)
- The `/oauth/token` request body

Example: `https://4e91dbcb57e9.ngrok-free.app/api/alibaba/callback`
- Same scheme (https)
- Same host (exact ngrok URL)
- Same path (no extra/missing trailing slash)

### ✅ 3. Service Provider
For Alibaba.com International (ICBU): `sp=icbu`

## Code Changes Summary

### `src/lib/providers/alibabaApi.ts`

**Before:**
```typescript
const url = `https://gw.api.alibaba.com/openapi/param2/1/system.oauth2/getToken/${appKey}`;
```

**After:**
```typescript
const ALIBABA_AUTH_BASE = 'https://openapi-auth.alibaba.com';
const TOKEN_URL = `${ALIBABA_AUTH_BASE}/oauth/token`;
```

**Key parameter changes:**
- Removed: `need_refresh_token`
- Added: `sp=icbu`
- Reordered to standard OAuth2 format

## Next Steps After Successful Token Exchange

Once you get a valid `access_token` and `refresh_token`:

1. **Store in Database**: Save both tokens with their expiration times
2. **Test API Calls**: Use the access token to call business APIs (products, orders, etc.) through the API gateway
3. **Implement Refresh**: Use the refresh token to get new access tokens when needed

## Why This Works

- **OAuth endpoints**: `https://openapi-auth.alibaba.com/oauth/*` (authorize, token)
- **Business API endpoints**: `https://gw.api.alibaba.com/openapi/*` (products, orders, etc.)

These are two separate systems:
- OAuth server handles authentication and authorization
- API gateway handles business operations (requires valid access token)

The previous code was trying to get OAuth tokens from the business API gateway, which doesn't handle OAuth – hence the `AppKeyNotFound` errors.
