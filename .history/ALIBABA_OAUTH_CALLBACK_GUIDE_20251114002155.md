# Alibaba OAuth2 Callback URL - Quick Reference

## What to Enter in Alibaba Developer Portal

When registering your app at https://open.alibaba.com/ or https://open.1688.com/, you'll see a field labeled:

**"Callback URL"** or **"Redirect URI"** or **"回调地址"**

### For Development (Local Testing)

```
https://localhost:3007/api/alibaba/callback
```

**Note:** Use `https://` (not `http://`) - Alibaba requires HTTPS even for localhost.

### For Production (Live Site)

```
https://your-domain.com/api/alibaba/callback
```

Replace `your-domain.com` with your actual domain, for example:
```
https://moqpools.com/api/alibaba/callback
```

---

## How the OAuth Flow Works

```
┌─────────────┐
│   Seller    │
│ Clicks      │
│ "Connect"   │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│  GET /api/alibaba/authorize            │
│  Your app generates auth URL           │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Alibaba Authorization Page            │
│  (auth.alibaba.com)                    │
│  Seller logs in and approves your app  │
└──────┬─────────────────────────────────┘
       │
       ▼  (Redirects with ?code=xxx)
┌────────────────────────────────────────┐
│  GET /api/alibaba/callback             │  ← THIS IS YOUR CALLBACK URL
│  ?code=authorization_code_here         │
│  ?state=random_csrf_token              │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Your app exchanges code for token     │
│  Stores: access_token, refresh_token   │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Redirect seller to success page       │
│  /admin/settings?alibaba_auth=success  │
└────────────────────────────────────────┘
```

---

## Configuration Checklist

- [ ] Register app at Alibaba Developer Portal
- [ ] Set Callback URL: `https://localhost:3007/api/alibaba/callback` (use HTTPS!)
- [ ] Copy App Key from portal
- [ ] Copy App Secret from portal
- [ ] Add to `.env`:
  ```env
  ALIBABA_APP_KEY=your_app_key_here
  ALIBABA_APP_SECRET=your_app_secret_here
  ALIBABA_REDIRECT_URI=https://localhost:3007/api/alibaba/callback
  ```
- [ ] Restart dev server: `pnpm run dev`
- [ ] Test authorization: Visit `https://localhost:3007/api/alibaba/authorize`

---

## Files Created

| File | Purpose |
|------|---------|
| `app/api/alibaba/authorize/route.ts` | Starts OAuth flow, redirects to Alibaba |
| `app/api/alibaba/callback/route.ts` | Receives auth code, exchanges for token |
| `src/lib/providers/alibabaApi.ts` | API client with OAuth methods |

---

## Environment Variables

```env
# Required
ALIBABA_APP_KEY=12345678
ALIBABA_APP_SECRET=abcdef1234567890abcdef1234567890
ALIBABA_REDIRECT_URI=http://localhost:3007/api/alibaba/callback

# Optional (defaults shown)
ALIBABA_AUTH_ENDPOINT=https://auth.alibaba.com/oauth/authorize  # For Alibaba.com
# ALIBABA_AUTH_ENDPOINT=https://auth.1688.com/oauth/authorize   # For 1688.com
```

---

## Testing the OAuth Flow

1. **Start your dev server:**
   ```powershell
   pnpm run dev
   ```

2. **Visit the authorization URL:**
   ```
   http://localhost:3007/api/alibaba/authorize
   ```

3. **You should be redirected to Alibaba login page**

4. **After login/approval, you'll be redirected back to:**
   ```
   http://localhost:3007/api/alibaba/callback?code=xxx&state=yyy
   ```

5. **Then redirected to success page:**
   ```
   http://localhost:3007/admin/settings?alibaba_auth=success
   ```

6. **Check your console for:**
   ```
   [Alibaba OAuth] ✓ Successfully obtained access token
     Token expires in: 7200 seconds
   ```

---

## Common Issues

### "Invalid callback URL"
- Make sure the URL in Alibaba portal EXACTLY matches your env variable
- Check for trailing slashes (don't include them)
- Use `http://` for localhost, `https://` for production

### "Authorization failed"
- Check App Key and App Secret are correct
- Verify your Alibaba developer account is active
- Make sure you're using the right auth endpoint (Alibaba.com vs 1688.com)

### "Token exchange failed"
- The authorization code expires after ~10 minutes
- Can only be used once
- Try the flow again from the start

---

## Next Steps

After OAuth is working:

1. Store tokens in your database (see TODO in `callback/route.ts`)
2. Add "Connect Alibaba" button to your admin panel
3. Display connection status to users
4. Use stored token for all API calls

---

**Questions?** Check `ALIBABA_API_COMPLETE_SETUP.md` for full documentation.
