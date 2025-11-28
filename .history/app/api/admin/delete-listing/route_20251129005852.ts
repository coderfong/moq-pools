import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '../../_lib/session';

export async function DELETE(request: Request) {
  try {
    const session = getSession();
    
    if (!session || !prisma) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user and verify admin role
    const db: any = prisma as any;
    const user = await db.user.findUnique({
      where: { id: session.sub },
      select: { 
        id: true, 
        email: true, 
        role: true,
      },
    });
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('id');
    const listingUrl = searchParams.get('url');
    
    if (!listingId && !listingUrl) {
      return NextResponse.json({ ok: false, error: 'Missing listing ID or URL parameter' }, { status: 400 });
    }
    
    let deletedCount = 0;
    
    // Delete by ID if provided
    if (listingId) {
      try {
        await db.savedListing.delete({
          where: { id: listingId }
        });
        deletedCount++;
        console.log(`[ADMIN DELETE] User ${user.email} deleted SavedListing with ID: ${listingId}`);
      } catch (error) {
        console.error('[ADMIN DELETE] Error deleting by ID:', error);
        // Continue to try URL deletion if ID deletion fails
      }
    }
    
    // Delete by URL if provided and ID deletion didn't work
    if (listingUrl && deletedCount === 0) {
      try {
        const result = await db.savedListing.deleteMany({
          where: { url: listingUrl }
        });
        deletedCount += result.count;
        console.log(`[ADMIN DELETE] User ${user.email} deleted ${result.count} SavedListing(s) with URL: ${listingUrl}`);
      } catch (error) {
        console.error('[ADMIN DELETE] Error deleting by URL:', error);
      }
    }
    
    // Also try to delete from Product table if it references this listing
    if (listingUrl) {
      try {
        const productResult = await db.product.deleteMany({
          where: { sourceUrl: listingUrl }
        });
        if (productResult.count > 0) {
          console.log(`[ADMIN DELETE] User ${user.email} also deleted ${productResult.count} Product(s) with sourceUrl: ${listingUrl}`);
        }
      } catch (error) {
        console.error('[ADMIN DELETE] Error deleting products by sourceUrl:', error);
      }
    }
    
    if (deletedCount === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Listing not found or already deleted',
        deletedCount: 0
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: `Successfully deleted ${deletedCount} listing(s)`,
      deletedCount
    }, { status: 200 });
    
  } catch (error) {
    console.error('[ADMIN DELETE] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}