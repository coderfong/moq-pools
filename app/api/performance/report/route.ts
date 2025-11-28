import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { performanceMonitor } from '@/lib/monitoring';

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const session = await auth();
    if (!session?.user?.email?.includes('admin') && 
        !session?.user?.email?.includes('jonfong78')) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const report = performanceMonitor.getPerformanceReport();
    
    return NextResponse.json({
      status: 'success',
      data: report,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Performance report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate performance report' },
      { status: 500 }
    );
  }
}