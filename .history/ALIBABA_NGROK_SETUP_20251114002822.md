# Alibaba OAuth with Ngrok - Quick Start

## The Problem

Alibaba requires a **publicly accessible HTTPS URL** for OAuth callbacks. `localhost` won't work because:
- Alibaba's servers can't reach your local machine
- Self-signed SSL certificates are rejected

## The Solution: Ngrok

Ngrok creates a secure tunnel to your localhost, giving you a public HTTPS URL.

---

## Step-by-Step Setup

### 1. Install Ngrok

**Option A: Via npm**
```powershell
npm install -g ngrok
```

**Option B: Download directly**
- Visit https://ngrok.com/download
- Download and extract for Windows
- Add to your PATH

### 2. Start Your Dev Server

```powershell
pnpm run dev
```

Your app is now running at `http://localhost:3007`

### 3. Start Ngrok (in a new terminal)

```powershell
ngrok http 3007
```

You'll see output like:
```
ngrok                                                           

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3007

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL:** `https://abc123.ngrok-free.app`

### 4. Configure Alibaba Developer Portal

1. Go to https://open.alibaba.com/ (or https://open.1688.com/)
2. Create/edit your application
3. Set **Callback URL** to:
   ```
   https://abc123.ngrok-free.app/api/alibaba/callback
   ```
   *(Replace with your actual ngrok URL)*

### 5. Update Your `.env` File

```env
ALIBABA_APP_KEY=your_app_key_from_alibaba
ALIBABA_APP_SECRET=your_app_secret_from_alibaba
ALIBABA_REDIRECT_URI=https://abc123.ngrok-free.app/api/alibaba/callback
```

**Important:** Update the URL each time you restart ngrok (free plan), or use a static domain (paid plan).

### 6. Restart Your Dev Server

```powershell
# Stop the current server (Ctrl+C)
pnpm run dev
```

This loads the new environment variables.

### 7. Test the OAuth Flow

Visit:
```
https://abc123.ngrok-free.app/api/alibaba/authorize
```

You should:
1. Be redirected to Alibaba login
2. Approve your application
3. Get redirected back to your app
4. See success message

---

## Ngrok Tips

### View Request Logs

Ngrok provides a web interface at:
```
http://127.0.0.1:4040
```

This shows all HTTP requests going through the tunnel - great for debugging!

### Free vs Paid

**Free Plan:**
- ✅ HTTPS tunnel
- ✅ Random URL each time
- ⚠️ URL changes when ngrok restarts
- ⚠️ Session timeout after 2 hours

**Paid Plan ($8/month):**
- ✅ Static domain (e.g., `myapp.ngrok.io`)
- ✅ No session timeout
- ✅ Custom domains

### Keep Ngrok Running

Ngrok must stay running while you test OAuth. Run it in a separate terminal window.

---

## Common Issues

### "ERR_NGROK_3200"
**Problem:** Your ngrok session expired (free plan has 2-hour limit)

**Solution:** 
1. Restart ngrok: `ngrok http 3007`
2. Update `.env` with new URL
3. Update Alibaba Developer Portal with new URL
4. Restart dev server

### "Callback URL mismatch"
**Problem:** The URL in Alibaba portal doesn't match your `.env`

**Solution:**
1. Make sure both use the EXACT same URL
2. Include `/api/alibaba/callback` path
3. No trailing slashes

### "Cannot reach callback"
**Problem:** Ngrok or dev server not running

**Solution:**
1. Verify ngrok is running: Check `http://127.0.0.1:4040`
2. Verify dev server is running: Check `http://localhost:3007`
3. Test the ngrok URL directly in browser

---

## Alternative: Deploy to Production

If ngrok is too cumbersome for development, deploy to a staging environment:

**Vercel:**
```powershell
vercel deploy
# Use the preview URL for OAuth callback
```

**Netlify:**
```powershell
netlify deploy
# Use the preview URL for OAuth callback
```

Then use the deployed URL as your callback:
```
https://your-app-preview.vercel.app/api/alibaba/callback
```

---

## Summary

**Checklist:**
- [ ] Install ngrok
- [ ] Start dev server: `pnpm run dev`
- [ ] Start ngrok: `ngrok http 3007`
- [ ] Copy HTTPS URL from ngrok
- [ ] Set callback in Alibaba portal: `https://your-url.ngrok-free.app/api/alibaba/callback`
- [ ] Update `.env` with same URL
- [ ] Restart dev server
- [ ] Test: Visit `https://your-url.ngrok-free.app/api/alibaba/authorize`

**Once working, you'll have:**
✅ Full OAuth flow with Alibaba
✅ Access to seller accounts
✅ Complete product API access
✅ No bot detection or blocking

---

**Need help?** See:
- `ALIBABA_OAUTH_CALLBACK_GUIDE.md` - Detailed OAuth guide
- `ALIBABA_API_COMPLETE_SETUP.md` - Full API setup
- https://ngrok.com/docs - Ngrok documentation
