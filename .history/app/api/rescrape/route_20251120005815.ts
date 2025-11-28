import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchProductDetail } from '@/lib/providers/detail';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();
    
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
    }
    
    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    
    // Get the listing
    const listing = await prisma.savedListing.findUnique({
      where: { id: listingId },
      select: { id: true, url: true, title: true, platform: true }
    });
    
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    if (!listing.url) {
      return NextResponse.json({ error: 'No URL' }, { status: 400 });
    }
    
    console.log(`[Re-scrape] ${listing.title} - ${listing.url}`);
    
    // Force re-scrape
    const detail = await fetchProductDetail(listing.url);
    
    if (!detail) {
      return NextResponse.json({ 
        success: false,
        error: 'No detail returned',
        listingId: listing.id
      });
    }
    
    // Update the database
    await prisma.savedListing.update({
      where: { id: listing.id },
      data: {
        detailJson: detail as any,
        detailUpdatedAt: new Date()
      }
    });
    
    const attrCount = detail.attributes ? detail.attributes.length : 0;
    const tierCount = detail.priceTiers ? detail.priceTiers.length : 0;
    
    return NextResponse.json({
      success: true,
      listingId: listing.id,
      title: listing.title,
      attributes: attrCount,
      priceTiers: tierCount,
      debugSource: detail.debugSource || 'normal',
      quality: attrCount >= 10 ? 'good' : attrCount > 0 ? 'partial' : 'bad'
    });
    
  } catch (error: any) {
    console.error('[Re-scrape error]', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
