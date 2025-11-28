import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  if (!prisma) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30d';
    
    // Calculate date range
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // User Growth Data
    const userGrowthQuery = `
      SELECT 
        DATE_TRUNC('week', "createdAt") as week,
        COUNT(*) as new_users
      FROM "User"
      WHERE "createdAt" >= $1
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week;
    `;
    
    const userGrowthResult = await prisma.$queryRawUnsafe(userGrowthQuery, startDate) as any[];
    const userGrowthData = userGrowthResult.map((row, index) => ({
      label: `Week ${index + 1}`,
      value: Number(row.new_users)
    }));

    // Revenue Data (from payments)
    const revenueQuery = `
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM("amount") as revenue
      FROM "Payment"
      WHERE "createdAt" >= $1 AND "status" = 'CAPTURED'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month;
    `;
    
    const revenueResult = await prisma.$queryRawUnsafe(revenueQuery, startDate) as any[];
    const revenueData = revenueResult.map((row, index) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = new Date(row.month).getMonth();
      return {
        label: monthNames[month],
        value: Number(row.revenue)
      };
    });

    // Pool Status Distribution
    const poolStatusQuery = `
      SELECT 
        "status",
        COUNT(*) as count
      FROM "Pool"
      GROUP BY "status";
    `;
    
    const poolStatusResult = await prisma.$queryRawUnsafe(poolStatusQuery) as any[];
    const poolStatusData = poolStatusResult.map(row => ({
      label: row.status || 'Unknown',
      value: Number(row.count),
      color: getStatusColor(row.status)
    }));

    // Top Categories (based on pool products - using title keywords)
    const topCategoriesQuery = `
      SELECT 
        CASE 
          WHEN LOWER(p."title") LIKE '%electronics%' OR LOWER(p."title") LIKE '%phone%' OR LOWER(p."title") LIKE '%computer%' THEN 'Electronics'
          WHEN LOWER(p."title") LIKE '%kitchen%' OR LOWER(p."title") LIKE '%home%' OR LOWER(p."title") LIKE '%furniture%' OR LOWER(p."title") LIKE '%dispenser%' THEN 'Home & Kitchen'
          WHEN LOWER(p."title") LIKE '%fashion%' OR LOWER(p."title") LIKE '%clothing%' OR LOWER(p."title") LIKE '%wear%' THEN 'Fashion'
          WHEN LOWER(p."title") LIKE '%tool%' OR LOWER(p."title") LIKE '%machine%' OR LOWER(p."title") LIKE '%equipment%' THEN 'Tools & Hardware'
          WHEN LOWER(p."title") LIKE '%beauty%' OR LOWER(p."title") LIKE '%cosmetic%' OR LOWER(p."title") LIKE '%skin%' THEN 'Beauty'
          WHEN LOWER(p."title") LIKE '%sport%' OR LOWER(p."title") LIKE '%fitness%' OR LOWER(p."title") LIKE '%outdoor%' THEN 'Sports & Outdoors'
          ELSE 'General Products'
        END as category,
        COUNT(*) as pool_count
      FROM "Pool" po
      LEFT JOIN "Product" p ON po."productId" = p."id"
      GROUP BY 
        CASE 
          WHEN LOWER(p."title") LIKE '%electronics%' OR LOWER(p."title") LIKE '%phone%' OR LOWER(p."title") LIKE '%computer%' THEN 'Electronics'
          WHEN LOWER(p."title") LIKE '%kitchen%' OR LOWER(p."title") LIKE '%home%' OR LOWER(p."title") LIKE '%furniture%' OR LOWER(p."title") LIKE '%dispenser%' THEN 'Home & Kitchen'
          WHEN LOWER(p."title") LIKE '%fashion%' OR LOWER(p."title") LIKE '%clothing%' OR LOWER(p."title") LIKE '%wear%' THEN 'Fashion'
          WHEN LOWER(p."title") LIKE '%tool%' OR LOWER(p."title") LIKE '%machine%' OR LOWER(p."title") LIKE '%equipment%' THEN 'Tools & Hardware'
          WHEN LOWER(p."title") LIKE '%beauty%' OR LOWER(p."title") LIKE '%cosmetic%' OR LOWER(p."title") LIKE '%skin%' THEN 'Beauty'
          WHEN LOWER(p."title") LIKE '%sport%' OR LOWER(p."title") LIKE '%fitness%' OR LOWER(p."title") LIKE '%outdoor%' THEN 'Sports & Outdoors'
          ELSE 'General Products'
        END
      ORDER BY pool_count DESC
      LIMIT 5;
    `;
    
    const topCategoriesResult = await prisma.$queryRawUnsafe(topCategoriesQuery) as any[];
    const topCategoriesData = topCategoriesResult.map((row, index) => ({
      label: row.category || 'Uncategorized',
      value: Number(row.pool_count),
      color: getCategoryColor(index)
    }));

    // Quick Stats
    const statsQuery = `
      SELECT 
        (SELECT AVG("totalPrice") FROM "PoolItem" WHERE "totalPrice" > 0) as avg_order_value,
        (SELECT COUNT(*) FROM "PoolItem") as total_orders,
        (SELECT COUNT(*) FROM "Pool") as total_pools,
        (SELECT COUNT(*) FROM "Pool" WHERE "status" = 'FULFILLED') as successful_pools,
        (SELECT AVG(EXTRACT(DAY FROM ("deadlineAt" - "createdAt"))) FROM "Pool" WHERE "deadlineAt" IS NOT NULL) as avg_days_to_deadline
    `;
    
    const statsResult = await prisma.$queryRawUnsafe(statsQuery) as any[];
    const stats = statsResult[0];
    const avgOrderValue = Number(stats?.avg_order_value || 0);
    const totalOrders = Number(stats?.total_orders || 0);
    const totalPools = Number(stats?.total_pools || 0);
    const successfulPools = Number(stats?.successful_pools || 0);
    const avgDaysToDeadline = Number(stats?.avg_days_to_deadline || 0);
    
    const poolSuccessRate = totalPools > 0 ? (successfulPools / totalPools) * 100 : 0;
    const conversionRate = totalOrders > 0 ? (totalOrders / totalPools) * 100 : 0;

    return NextResponse.json({
      userGrowthData,
      revenueData,
      poolStatusData,
      topCategoriesData,
      quickStats: {
        avgOrderValue: Math.round(avgOrderValue),
        conversionRate: Math.round(conversionRate * 10) / 10,
        poolSuccessRate: Math.round(poolSuccessRate),
        avgDaysToDeadline: Math.round(avgDaysToDeadline)
      }
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return '#22c55e';
    case 'OPEN': return '#eab308';
    case 'FULFILLED': return '#3b82f6';
    case 'FAILED': return '#ef4444';
    case 'CANCELLED': return '#6b7280';
    case 'LOCKED': return '#f97316';
    default: return '#9ca3af';
  }
}

function getCategoryColor(index: number): string {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
  return colors[index % colors.length];
}