import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { securityMonitor } from '@/lib/monitoring';

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession();
    if (!session?.user?.email?.includes('admin') && 
        !session?.user?.email?.includes('jonfong78')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const report = securityMonitor.getSecurityReport();
    
    return NextResponse.json({
      status: 'success',
      data: report,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Security report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate security report' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Manual security event logging endpoint
    const session = await getServerSession();
    if (!session?.user?.email?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, details } = body;

    securityMonitor.logEvent({
      type: type || 'manual',
      ip: req.headers.get('x-forwarded-for') || 'manual',
      userAgent: req.headers.get('user-agent') || 'manual',
      path: '/api/security/report',
      timestamp: new Date(),
      details,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Security event logged',
    });

  } catch (error) {
    console.error('Security log error:', error);
    return NextResponse.json(
      { error: 'Failed to log security event' },
      { status: 500 }
    );
  }
}