# Quick Start: Email Verification

## 🚀 Your email verification is ready! Just add SMTP credentials.

### Option 1: Gmail (Fastest for Testing)

1. **Enable 2-Step Verification**: https://myaccount.google.com/security
2. **Get App Password**: https://myaccount.google.com/apppasswords
3. **Update `.env` file**:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="MOQ Pools <your-email@gmail.com>"
```

### Option 2: Resend (Recommended)

1. **Sign up**: https://resend.com/signup
2. **Get API key** from dashboard
3. **Update `.env` file**:

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM="MOQ Pools <onboarding@resend.dev>"
```

---

## Test It!

1. **Restart dev server**: `pnpm run dev`
2. **Go to**: http://localhost:3000/register
3. **Enter email and password**
4. **Click "Verify email"**
5. **Check your inbox** for the 4-digit code
6. **Enter code** in the modal
7. **Click "Next"** to complete registration

---

## How It Works

### Flow:
1. User enters email/password → clicks "Verify email"
2. System sends 4-digit code to user's email
3. User enters code in modal
4. Backend validates code against JWT token
5. If valid → account created and user logged in

### Security:
- ✅ Code expires in 10 minutes
- ✅ Code is cryptographically signed (JWT)
- ✅ Email must match the token
- ✅ One-time use tokens
- ✅ HTTPS encryption (in production)

---

## Troubleshooting

### No email received?
1. **Check spam/junk folder**
2. **Verify SMTP credentials in `.env`**
3. **Check browser console** - in dev mode without SMTP, code appears in console
4. **Restart dev server** after changing `.env`

### "Invalid verification code" error?
- Code expired (10 min limit) → request new code
- Wrong code entered → try again
- Email doesn't match → check email address

### SMTP errors?
- Gmail: Use App Password, not regular password
- Check SMTP_HOST, SMTP_PORT are correct
- Verify firewall allows outbound SMTP (port 587)

---

## Development Mode

If SMTP is **not configured**, the system still works:
- Code is logged to browser console: `[dev] verification code: 1234`
- API returns the code in the response
- You can test the full flow without email setup

---

## Production Checklist

- [ ] Use production SMTP service (not personal Gmail)
- [ ] Set up SPF, DKIM, DMARC for your domain
- [ ] Verify domain with email provider
- [ ] Use environment variables (never commit credentials)
- [ ] Enable HTTPS
- [ ] Monitor email deliverability
- [ ] Implement rate limiting
- [ ] Consider using a dedicated email service like SendGrid/Resend/AWS SES

---

## File Changes Made

✅ `app/register/page.tsx` - Added verification code and token to registration request
✅ `app/api/register/route.ts` - Added verification code validation
✅ `.env` - Added SMTP placeholder config

**No database migrations needed!** Everything works with your existing schema.

---

## Next Steps

1. Choose an SMTP provider (Gmail for quick test, Resend for production)
2. Add credentials to `.env`
3. Restart dev server
4. Test the flow

**That's it!** 🎉
