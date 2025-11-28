import { NextRequest } from 'next/server';

interface SecurityEvent {
  type: 'rate_limit' | 'suspicious_request' | 'failed_auth' | 'csrf_violation' | 'admin_access';
  ip: string;
  userAgent: string;
  path: string;
  timestamp: Date;
  details?: any;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private alertThresholds = {
    rate_limit: 10,        // Alert after 10 rate limit violations from same IP
    suspicious_request: 5,  // Alert after 5 suspicious requests from same IP
    failed_auth: 5,        // Alert after 5 failed auth attempts from same IP
    csrf_violation: 3,     // Alert after 3 CSRF violations from same IP
    admin_access: 2,       // Alert after 2 admin access attempts
  };

  logEvent(event: SecurityEvent) {
    this.events.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    this.checkForAlerts(event);
  }

  private checkForAlerts(event: SecurityEvent) {
    const recentEvents = this.getRecentEventsForIP(event.ip, event.type, 15); // Last 15 minutes
    const threshold = this.alertThresholds[event.type];
    
    if (recentEvents.length >= threshold) {
      this.sendAlert(event, recentEvents.length);
    }
  }

  private getRecentEventsForIP(ip: string, type: string, minutes: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(e => 
      e.ip === ip && 
      e.type === type && 
      e.timestamp > cutoff
    );
  }

  private async sendAlert(event: SecurityEvent, count: number) {
    const alertMessage = {
      type: 'SECURITY_ALERT',
      severity: 'HIGH',
      message: `${count} ${event.type} events from IP ${event.ip}`,
      details: {
        ip: event.ip,
        userAgent: event.userAgent,
        path: event.path,
        count,
        eventType: event.type,
        timestamp: event.timestamp.toISOString(),
      }
    };

    // Log to console (in production, send to monitoring service)
    console.error('🚨 SECURITY ALERT:', alertMessage);

    // In production, send to external monitoring services:
    // - Sentry
    // - Slack webhook
    // - Email notification
    // - PagerDuty
    
    try {
      // Example: Send to Sentry
      if (process.env.SENTRY_DSN) {
        // Sentry.captureException(new Error(`Security Alert: ${alertMessage.message}`), {
        //   tags: { type: 'security', severity: 'high' },
        //   extra: alertMessage.details
        // });
      }

      // Example: Send to Slack webhook
      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 MOQ Pools Security Alert`,
            blocks: [{
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Security Event:* ${alertMessage.message}\\n*IP:* ${event.ip}\\n*Path:* ${event.path}\\n*Count:* ${count}`
              }
            }]
          })
        });
      }

      // Example: Send email alert
      if (process.env.ADMIN_EMAIL && process.env.SMTP_HOST) {
        // Send email using nodemailer or your email service
      }

    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  getSecurityReport(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > last24h);
    
    const summary = {
      total_events: recentEvents.length,
      by_type: {} as Record<string, number>,
      by_ip: {} as Record<string, number>,
      top_paths: {} as Record<string, number>,
    };

    recentEvents.forEach(event => {
      summary.by_type[event.type] = (summary.by_type[event.type] || 0) + 1;
      summary.by_ip[event.ip] = (summary.by_ip[event.ip] || 0) + 1;
      summary.top_paths[event.path] = (summary.top_paths[event.path] || 0) + 1;
    });

    return {
      timestamp: now.toISOString(),
      period: 'last_24_hours',
      summary,
      recent_events: recentEvents.slice(-10), // Last 10 events
    };
  }
}

// Singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper function to extract client IP
export function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         req.headers.get('x-cluster-client-ip') ||
         'unknown';
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Array<{
    path: string;
    method: string;
    duration: number;
    status: number;
    timestamp: Date;
    ip: string;
  }> = [];

  logRequest(req: NextRequest, duration: number, status: number) {
    this.metrics.push({
      path: req.nextUrl.pathname,
      method: req.method,
      duration,
      status,
      timestamp: new Date(),
      ip: getClientIP(req),
    });

    // Keep only last 500 metrics
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-500);
    }

    // Alert on slow requests
    if (duration > 5000) { // 5 seconds
      console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.nextUrl.pathname} - ${duration}ms`);
    }
  }

  getPerformanceReport(): any {
    const recentMetrics = this.metrics.slice(-100);
    
    if (recentMetrics.length === 0) {
      return { message: 'No metrics available' };
    }

    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
    const slowRequests = recentMetrics.filter(m => m.duration > 2000);
    const errorRequests = recentMetrics.filter(m => m.status >= 400);

    return {
      timestamp: new Date().toISOString(),
      total_requests: recentMetrics.length,
      average_duration_ms: Math.round(avgDuration),
      slow_requests: slowRequests.length,
      error_requests: errorRequests.length,
      error_rate: ((errorRequests.length / recentMetrics.length) * 100).toFixed(2) + '%',
      slowest_endpoints: this.getSlowEndpoints(recentMetrics),
    };
  }

  private getSlowEndpoints(metrics: typeof this.metrics) {
    const pathDurations: Record<string, number[]> = {};
    
    metrics.forEach(m => {
      if (!pathDurations[m.path]) {
        pathDurations[m.path] = [];
      }
      pathDurations[m.path].push(m.duration);
    });

    return Object.entries(pathDurations)
      .map(([path, durations]) => ({
        path,
        avg_duration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        requests: durations.length,
      }))
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .slice(0, 5);
  }
}

export const performanceMonitor = new PerformanceMonitor();