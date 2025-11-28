# Email Verification Setup Guide

## Current Status

✅ The email verification code is already implemented in your app!
✅ API route exists: `/api/register/send-code`
✅ Frontend integration is complete

❌ **Missing:** SMTP configuration to actually send emails

---

## Quick Setup Options

### Option 1: Gmail (Easiest for Testing)

**Step 1:** Enable 2-Step Verification on your Google Account
- Go to https://myaccount.google.com/security
- Enable 2-Step Verification if not already enabled

**Step 2:** Generate an App Password
- Visit https://myaccount.google.com/apppasswords
- Select "Mail" and your device
- Copy the 16-character password

**Step 3:** Update your `.env` file with these values:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Your 16-char App Password (remove spaces)
SMTP_FROM="MOQ Pools <your-email@gmail.com>"
```

**Limits:** 500 emails/day (free), 2000/day for Google Workspace

---

### Option 2: Resend (Recommended for Production)

**Step 1:** Sign up at https://resend.com/signup (free tier: 100 emails/day)

**Step 2:** Get your API key from the dashboard

**Step 3:** Update your `.env` file:

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM="MOQ Pools <onboarding@resend.dev>"  # or your verified domain
```

**Benefits:**
- Modern API
- Great deliverability
- Developer-friendly dashboard
- Free tier: 100 emails/day, 3,000/month

---

### Option 3: SendGrid

**Step 1:** Sign up at https://sendgrid.com (free tier: 100 emails/day)

**Step 2:** Create an API key in Settings → API Keys

**Step 3:** Update your `.env` file:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key_here
SMTP_FROM="MOQ Pools <your-verified-email@yourdomain.com>"
```

---

### Option 4: AWS SES (Best for Production Scale)

**Step 1:** Set up AWS SES and verify your domain/email

**Step 2:** Generate SMTP credentials in SES console

**Step 3:** Update your `.env` file:

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Your region
SMTP_PORT=587
SMTP_USER=your_aws_smtp_username
SMTP_PASS=your_aws_smtp_password
SMTP_FROM="MOQ Pools <no-reply@yourdomain.com>"
```

**Benefits:**
- Very cheap ($0.10 per 1,000 emails)
- Highly scalable
- Great deliverability

---

## Testing Your Setup

1. **Update the `.env` file** with your chosen provider's settings

2. **Restart your development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   pnpm run dev
   ```

3. **Test the registration flow:**
   - Go to `/register`
   - Enter your email and password
   - Check your email inbox for the verification code
   - Enter the code in the modal

4. **Check for errors:**
   - Open browser DevTools Console (F12)
   - In development mode, if SMTP is not configured, the code will be logged to the console

---

## Troubleshooting

### Emails not arriving?

1. **Check spam folder** - Especially for Gmail/Yahoo
2. **Verify SMTP credentials** - Make sure they're correct
3. **Check server logs** - The API will return errors if SMTP config is invalid
4. **Enable "Less secure app access"** (Gmail only, not recommended)
5. **Use App Password instead of regular password** (Gmail)

### Development Mode Fallback

If SMTP is not configured, the API returns the verification code in the response:
- Check browser console: `[dev] verification code: 1234`
- This allows you to test the flow without email setup

### Production Considerations

1. **Use a dedicated email service** (not personal Gmail)
2. **Set up SPF, DKIM, and DMARC records** for your domain
3. **Verify your domain** with your email provider
4. **Monitor email deliverability** and bounce rates
5. **Implement rate limiting** to prevent abuse

---

## Current Implementation Details

### Email Template

The verification email includes:
- **Subject:** "Your verification code"
- **Body:** "Your MOQ Pools verification code is **XXXX**. It expires in 10 minutes."

### Security Features

✅ Code expires in 10 minutes
✅ Code is signed with JWT token
✅ Code is validated on registration
✅ Protection against timing attacks

### Want to customize the email template?

Edit: `app/api/register/send-code/route.ts`

```typescript
await transporter.sendMail({
  from: SMTP_FROM,
  to: email,
  subject: "Your verification code",
  text: `Your MOQ Pools verification code is ${code}. It expires in 10 minutes.`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f97316;">Welcome to MOQ Pools!</h2>
      <p>Your verification code is:</p>
      <div style="background: #fff7ed; padding: 20px; text-align: center; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 8px;">${code}</span>
      </div>
      <p style="color: #666; margin-top: 20px;">This code expires in 10 minutes.</p>
    </div>
  `,
});
```

---

## Next Steps

1. ✅ Choose an email provider (I recommend **Resend** for simplicity or **Gmail** for quick testing)
2. ✅ Add the SMTP credentials to your `.env` file
3. ✅ Restart your dev server
4. ✅ Test the registration flow

**That's it!** Your email verification is ready to go. 🎉
