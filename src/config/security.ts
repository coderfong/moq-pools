import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ADMIN_IPS = [
  '127.0.0.1',
  '::1',
  // Add your admin IP addresses here
  // 'xxx.xxx.xxx.xxx',
];

const RATE_LIMITS = {
  global: { requests: 1000, window: 60 }, // 1000 req/min globally
  perIP: { requests: 100, window: 60 },   // 100 req/min per IP
  perUser: { requests: 50, window: 60 },  // 50 req/min per user
  api: { requests: 200, window: 60 },     // 200 req/min for API
};

const SECURITY_CONFIG = {
  enableCSRF: process.env.ENABLE_CSRF_PROTECTION === 'true',
  enableRateLimit: process.env.ENABLE_RATE_LIMITING === 'true',
  enableAntiCopy: process.env.ENABLE_ANTI_COPY_PROTECTION === 'true',
  securityMode: process.env.NEXT_PUBLIC_SECURITY_MODE as 'strict' | 'normal' | 'disabled' || 'normal',
};

const BLOCKED_USER_AGENTS = [
  /bot|crawl|spider|scrape/i,
  /curl|wget|python|go-http/i,
  /postman|insomnia|httpie/i,
  /scanner|vulnerability|security/i,
];

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_BASE_URL,
  'http://localhost:3007',
  'https://your-domain.com',
  // Add your allowed domains
];

const HONEYPOT_PATHS = [
  '/wp-admin',
  '/admin.php', 
  '/phpmyadmin',
  '/.env',
  '/config.php',
  '/database.php',
];

export {
  ADMIN_IPS,
  RATE_LIMITS,
  SECURITY_CONFIG,
  BLOCKED_USER_AGENTS,
  ALLOWED_ORIGINS,
  HONEYPOT_PATHS,
};