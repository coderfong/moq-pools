import { NextRequest, NextResponse } from 'next/server';
import { querySavedListings } from '@/lib/listingStore';

/**
 * GET /api/listings/featured
 * Returns featured listings from SavedListing table for homepage carousel
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const platform = searchParams.get('platform') || 'ALL';
    
    // Query SavedListing table
    const listings = await querySavedListings({
      q: '',
      platform: platform === 'ALL' ? undefined : platform,
      categories: [],
      offset: 0,
      limit: Math.min(limit, 50), // Cap at 50
    });
    
    // Transform to expected format
    const items = listings.map((listing) => ({
      id: listing.id, // Add ID for linking to pool pages
      title: listing.title || 'Featured Product',
      image: listing.image || '/seed/sleeves.jpg',
      price: listing.price || '',
      unitPrice: listing.unitPrice,
      currency: listing.currency,
      moq: listing.moq || '',
      moqQty: listing.moqQty,
      url: listing.url || '#',
      sourceUrl: listing.url || '#',
      platform: listing.platform,
      supplierName: listing.supplierName || '',
    }));
    
    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('Error fetching featured listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured listings', items: [] },
      { status: 500 }
    );
  }
}
