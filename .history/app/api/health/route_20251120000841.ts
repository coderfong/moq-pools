import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  version: string;
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbResponseTime: number | undefined;

  // Test database connection
  try {
    const dbStart = Date.now();
    await prisma?.$queryRaw`SELECT 1`;
    dbResponseTime = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (error) {
    console.error('[Health Check] Database connection failed:', error);
  }

  const health: HealthStatus = {
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp,
    uptime,
    database: {
      status: dbStatus,
      responseTime: dbResponseTime,
    },
    version: process.env.npm_package_version || '0.3.0',
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
