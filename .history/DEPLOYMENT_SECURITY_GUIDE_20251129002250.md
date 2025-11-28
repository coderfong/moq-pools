# 🚀 Production Deployment Security Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Security
```bash
# ⚠️ CRITICAL: Change ALL default secrets!

# Generate secure secrets (Linux/macOS)
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 32  # For AUTH_SECRET  
openssl rand -hex 32  # For CSRF_SECRET
openssl rand -hex 32  # For CRON_SECRET

# Windows PowerShell
[System.Web.Security.Membership]::GeneratePassword(64, 10)
```

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Replace ALL placeholder values with production secrets
- [ ] Set production database URL with SSL
- [ ] Configure production OAuth credentials
- [ ] Set production Stripe keys
- [ ] Configure SMTP for production emails
- [ ] Set up Sentry error monitoring
- [ ] Configure Cloudflare Turnstile

### 2. Database Security
```sql
-- Create production database with restricted user
CREATE USER moq_pools_prod WITH PASSWORD 'your_secure_password';
CREATE DATABASE moq_pools_prod OWNER moq_pools_prod;

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE moq_pools_prod TO moq_pools_prod;
GRANT USAGE ON SCHEMA public TO moq_pools_prod;
GRANT ALL ON ALL TABLES IN SCHEMA public TO moq_pools_prod;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO moq_pools_prod;

-- Enable SSL
-- Add to postgresql.conf: ssl = on
-- Add to pg_hba.conf: hostssl all all 0.0.0.0/0 md5
```

### 3. Server Security Hardening

#### Firewall Configuration
```bash
# Ubuntu/Debian UFW
sudo ufw enable
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw deny 3007/tcp    # Block direct access to Node.js

# CentOS/RHEL firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

#### Nginx Reverse Proxy (Recommended)
```nginx
# /etc/nginx/sites-available/moq-pools
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=2r/s;
    
    # Main location
    location / {
        limit_req zone=general burst=10 nodelay;
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3007;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Block common attack vectors
    location ~ /\\.env {
        deny all;
        return 404;
    }
    
    location ~ /(wp-admin|phpmyadmin|admin\\.php) {
        deny all;
        return 404;
    }
}
```

### 4. PM2 Process Management
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'moq-pools',
    script: 'pnpm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3007,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=4096'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🛡️ Security Monitoring Setup

### 1. Sentry Error Monitoring
```bash
# Sign up at sentry.io and get your DSN
# Add to .env.production:
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456
```

### 2. Log Monitoring
```bash
# Set up log rotation
sudo tee /etc/logrotate.d/moq-pools << 'EOF'
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reload moq-pools
    endscript
}
EOF
```

### 3. Uptime Monitoring
- Set up monitoring with services like:
  - Pingdom
  - UptimeRobot
  - StatusCake
  - Datadog

## 🔒 Anti-Copying & IP Protection

### 1. Legal Protection
- [ ] Add Terms of Service
- [ ] Add Privacy Policy
- [ ] Add Copyright Notice
- [ ] Register trademark if applicable
- [ ] Document your IP

### 2. Technical Protection
- [x] Right-click disabled
- [x] Text selection disabled
- [x] DevTools detection
- [x] Image watermarking
- [x] Code obfuscation
- [x] Console hijacking

### 3. Content Protection
```javascript
// Add to your layout component
import { AntiCopyProtection } from '@/components/AntiCopyProtection';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AntiCopyProtection />
        {children}
      </body>
    </html>
  );
}
```

## 📊 Performance Optimization

### 1. Next.js Production Build
```bash
# Build for production
pnpm build

# Analyze bundle size
pnpm analyze  # If you have bundle analyzer setup
```

### 2. Database Optimization
```sql
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Vacuum and analyze
VACUUM ANALYZE;
```

### 3. CDN Setup
- Set up CloudFlare or AWS CloudFront
- Configure static asset caching
- Enable compression (gzip/brotli)

## 🚨 Incident Response Plan

### 1. Security Breach Response
1. **Immediate Actions**
   - Block suspicious IPs
   - Change all secrets/passwords
   - Alert users if data compromised
   - Document the incident

2. **Investigation**
   - Review server logs
   - Check database access logs
   - Analyze attack vectors
   - Assess data impact

3. **Recovery**
   - Patch vulnerabilities
   - Restore from clean backups
   - Update security measures
   - Conduct post-incident review

### 2. Emergency Contacts
- [ ] Set up emergency contact list
- [ ] Configure alerting systems
- [ ] Prepare incident response team

## 📈 Monitoring Dashboard

Access security and performance reports at:
- `/api/security/report` - Security monitoring
- `/api/performance/report` - Performance metrics

## 🔄 Regular Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor security alerts
- [ ] Review performance metrics

### Weekly  
- [ ] Update dependencies
- [ ] Review security reports
- [ ] Check backup integrity

### Monthly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Incident response drill
- [ ] Update documentation

---

## 🚀 Deployment Commands

```bash
# 1. Clone and setup
git clone your-repo
cd moq-pools
cp .env.production.example .env.production
# Edit .env.production with your values

# 2. Install dependencies
pnpm install

# 3. Database setup
pnpm prisma generate
pnpm prisma migrate deploy

# 4. Build application  
pnpm build

# 5. Start with PM2
pm2 start ecosystem.config.js

# 6. Setup monitoring
# Configure Nginx, SSL, monitoring tools
```

Your MOQ Pools application is now ready for production with enterprise-grade security! 🎉