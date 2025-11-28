import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// CSRF token management
export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || 'csrf-secret-change-in-production';
  private static readonly TOKEN_LIFETIME = 3600; // 1 hour
  
  // Generate CSRF token
  static generateToken(sessionId: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${nonce}`;
    const signature = this.sign(payload);
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }
  
  // Verify CSRF token
  static verifyToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');
      if (parts.length !== 4) return false;
      
      const [tokenSessionId, timestamp, nonce, signature] = parts;
      
      // Verify session ID matches
      if (tokenSessionId !== sessionId) return false;
      
      // Check token hasn't expired
      const now = Math.floor(Date.now() / 1000);
      if (now - parseInt(timestamp) > this.TOKEN_LIFETIME) return false;
      
      // Verify signature
      const payload = `${tokenSessionId}:${timestamp}:${nonce}`;
      const expectedSignature = this.sign(payload);
      
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
  
  private static sign(payload: string): string {
    return createHash('sha256')
      .update(payload + this.SECRET)
      .digest('hex');
  }
}

// Middleware to inject CSRF tokens
export function withCSRFProtection(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const method = req.method.toUpperCase();
    
    // GET, HEAD, OPTIONS are safe methods - just add token to response
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const response = await handler(req);
      
      // Add CSRF token to response headers for client to use
      const sessionId = req.cookies.get('session')?.value || 'anonymous';
      const csrfToken = CSRFProtection.generateToken(sessionId);
      
      response.headers.set('X-CSRF-Token', csrfToken);
      return response;
    }
    
    // For state-changing methods, verify CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const sessionId = req.cookies.get('session')?.value;
      if (!sessionId) {
        return new NextResponse(
          JSON.stringify({ error: 'No session found' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const csrfToken = req.headers.get('X-CSRF-Token') || req.headers.get('x-csrf-token');
      if (!csrfToken || !CSRFProtection.verifyToken(csrfToken, sessionId)) {
        console.warn(`🚨 CSRF protection triggered for ${req.url}`);
        return new NextResponse(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return handler(req);
  };
}

// Input sanitization utilities
export class InputSanitizer {
  // Basic SQL injection prevention
  static sanitizeSQL(input: string): string {
    return input
      .replace(/[';\\]/g, '') // Remove dangerous characters
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi, '') // Remove SQL keywords
      .trim()
      .substring(0, 1000); // Limit length
  }
  
  // XSS prevention
  static sanitizeHTML(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 5000); // Limit length
  }
  
  // Path traversal prevention
  static sanitizePath(input: string): string {
    return input
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid path characters
      .replace(/^\/+/, '') // Remove leading slashes
      .trim()
      .substring(0, 255); // Limit length
  }
  
  // Email validation
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  // URL validation
  static validateURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}