# Security Improvements Guide

## ✅ Completed (Production Ready)

### 1. TypeScript Type Safety
- Fixed all prisma undefined checks in API routes
- Added database availability validation
- Restored missing `toSourcePlatform()` function
- Excluded backup files from typecheck

### 2. Session Security
- **FIXED**: Removed `"dev-secret"` fallback in `/api/login/route.ts`
- Session tokens now fail explicitly if `SESSION_SECRET` is missing
- Prevents session forgery attacks

### 3. Core Security Features
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ HMAC-SHA256 signed session tokens
- ✅ Email verification (2-step registration)
- ✅ Cloudflare Turnstile CAPTCHA
- ✅ Security headers (HSTS, X-Frame-Options, CSP, etc.)
- ✅ Prisma ORM (SQL injection protection)
- ✅ `.env` gitignored properly
- ✅ Stripe webhook signature verification

---

## 🚨 CRITICAL: Before Deployment

### Rotate All Secrets in `.env`
Your current `.env` contains **exposed production secrets**. Rotate these immediately:

1. **Database Password**
   - Go to Railway dashboard
   - Regenerate PostgreSQL password
   - Update `DATABASE_URL`

2. **Stripe Keys**
   - Dashboard → Developers → API keys
   - Roll keys and update webhooks
   - Update: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

3. **Session Secret**
   - Generate new 32-byte random secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Update `SESSION_SECRET`

4. **Gmail App Password**
   - Revoke current app password at https://myaccount.google.com/apppasswords
   - Generate new one
   - Update `SMTP_PASS`

5. **Cloudflare Turnstile**
   - Consider rotating if keys were committed
   - Update `TURNSTILE_SECRET_KEY`

### Verify `.env` Never Committed
```bash
git log --all --full-history -- .env
git log --all --full-history -- "*.env"
```
If found, consider rotating secrets and using `.git-filter-repo` to remove from history.

---

## 🔒 High Priority (Add Before Launch)

### 1. Rate Limiting
Currently missing on critical endpoints. Implement with Upstash Redis:

**Install:**
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

**Setup Upstash:**
1. Create account at https://upstash.com
2. Create Redis database (free tier: 10K requests/day)
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add to `.env`

**Example Implementation:**
```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const loginRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "5 m"), // 5 attempts per 5 minutes
  analytics: true,
});

export const apiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per minute
});
```

**Apply to Routes:**
```typescript
// app/api/login/route.ts
import { loginRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await loginRateLimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { ok: false, reason: "rate_limit_exceeded" }, 
      { status: 429 }
    );
  }
  // ... rest of login logic
}
```

**Priority Endpoints:**
- `/api/login` - Prevent brute force attacks
- `/api/register/send-code` - Prevent email bombing
- `/api/messages` - Prevent spam
- `/api/rescrape` - Prevent resource exhaustion
- `/api/external/search` - Prevent API abuse

### 2. Input Validation with Zod
Add strict schema validation to prevent injection/overflow attacks:

**Install:**
```bash
pnpm add zod
```

**Example Schemas:**
```typescript
// lib/validation.ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
  verificationCode: z.string().length(6).regex(/^\d{6}$/),
  verifyToken: z.string().min(1),
  token: z.string().optional(), // Turnstile
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const messageSchema = z.object({
  text: z.string().min(1).max(5000),
  conversationId: z.string().cuid(),
});
```

**Apply to Routes:**
```typescript
// app/api/register/route.ts
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, reason: "validation_error", errors: validation.error.issues },
      { status: 400 }
    );
  }
  
  const { email, password, verificationCode } = validation.data;
  // ... rest of logic
}
```

### 3. Make Turnstile Required
Remove optional CAPTCHA check in production:

**Update `.env`:**
```env
# Make required in production
REQUIRE_TURNSTILE=true
```

**Update `/api/register/route.ts`:**
```typescript
const requireTurnstile = process.env.NODE_ENV === "production" || 
                         process.env.REQUIRE_TURNSTILE === "true";

if (requireTurnstile && !turnstileToken) {
  return NextResponse.json({ ok: false, reason: "missing_captcha" }, { status: 400 });
}
```

---

## 📋 Medium Priority (Post-Launch)

### 4. Account Lockout
Prevent brute force after N failed attempts:

```typescript
// After 5 failed logins, lock account for 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Store in Redis or add to User model:
// failedLoginAttempts: Int
// lockedUntil: DateTime?
```

### 5. Enhanced Logging
Track security events for audit:

```typescript
// Consider Axiom, LogFlare, or Datadog
await logger.security({
  event: "login_failed",
  email,
  ip,
  timestamp: new Date(),
  reason: "invalid_credentials"
});
```

### 6. Content Security Policy (CSP)
Tighten CSP to remove `'unsafe-inline'`:

```typescript
// next.config.mjs
"Content-Security-Policy": 
  "default-src 'self'; " +
  "script-src 'self' 'nonce-{GENERATED}' https://challenges.cloudflare.com; " +
  "style-src 'self' 'nonce-{GENERATED}'; " +
  "img-src 'self' data: https:; " +
  "connect-src 'self' https://challenges.cloudflare.com;"
```

### 7. Two-Factor Authentication (2FA)
Add for admin accounts:

```bash
pnpm add @simplewebauthn/server @simplewebauthn/browser
```

### 8. Security Headers Audit
Add additional headers:

```typescript
"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
"X-Permitted-Cross-Domain-Policies": "none",
"Cross-Origin-Embedder-Policy": "require-corp",
"Cross-Origin-Opener-Policy": "same-origin",
"Cross-Origin-Resource-Policy": "same-origin"
```

### 9. CORS Configuration
Explicitly configure allowed origins:

```typescript
// middleware.ts
const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://yourdomain.com"]
  : ["http://localhost:3000"];
```

### 10. Dependency Scanning
Set up automated security scanning:

```bash
# Add to package.json scripts
"security:audit": "pnpm audit --audit-level=moderate",
"security:check": "pnpm outdated"
```

Configure Dependabot in `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## 🔐 Best Practices

### Environment Variables
- Never commit `.env` files
- Use different secrets per environment (dev/staging/prod)
- Rotate secrets quarterly
- Use managed secret services (Vercel/Railway built-in, AWS Secrets Manager, etc.)

### Password Policy
Current: bcrypt with 10 rounds ✅  
Consider adding:
- Password history (prevent reuse)
- Periodic password expiry for admins
- Password strength meter in UI

### Session Management
Current: 7-day JWT-style tokens with HMAC ✅  
Consider adding:
- Session revocation (logout all devices)
- Suspicious activity detection
- Device fingerprinting

### API Security
- Always validate input lengths
- Sanitize user-generated content
- Use prepared statements (Prisma does this ✅)
- Implement CSRF tokens for state-changing operations
- Add request signing for webhooks

---

## 🛡️ Security Checklist

**Before Production Deployment:**
- [ ] Rotate all secrets in `.env`
- [ ] Verify `.env` never committed to git
- [ ] Add rate limiting to auth endpoints
- [ ] Add input validation with zod
- [ ] Make Turnstile CAPTCHA required
- [ ] Set `NODE_ENV=production`
- [ ] Enable Sentry error monitoring
- [ ] Configure uptime monitoring
- [ ] Test password reset flow
- [ ] Test email verification flow
- [ ] Review all API routes for auth checks
- [ ] Enable database connection pooling
- [ ] Configure SSL/TLS (handled by Vercel/Railway)
- [ ] Set up automated backups

**Post-Launch:**
- [ ] Monitor Sentry for errors
- [ ] Review access logs weekly
- [ ] Test disaster recovery
- [ ] Audit user permissions
- [ ] Update dependencies monthly
- [ ] Penetration testing (consider HackerOne)
- [ ] GDPR/privacy policy compliance
- [ ] Security bug bounty program

---

## 📞 Security Incident Response

If you suspect a breach:

1. **Immediate Actions:**
   - Rotate all secrets (database, Stripe, session, API keys)
   - Lock affected user accounts
   - Enable maintenance mode if needed
   - Preserve logs for forensics

2. **Investigation:**
   - Check Sentry error logs
   - Review database access logs (Railway)
   - Check Stripe webhook logs
   - Analyze unusual traffic patterns

3. **Communication:**
   - Notify affected users within 72 hours (GDPR requirement)
   - Report to payment processor (Stripe) if financial data involved
   - Document incident timeline

4. **Prevention:**
   - Patch vulnerability
   - Add tests to prevent regression
   - Update security documentation
   - Review similar code paths

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist)
- [Stripe Security](https://stripe.com/docs/security/guide)
- [Railway Security](https://docs.railway.app/reference/security)
- [Prisma Security](https://www.prisma.io/docs/guides/database/advanced-database-tasks/sql-injection)

---

**Last Updated:** November 20, 2025  
**Status:** 2/4 critical tasks completed, ready for rate limiting implementation
