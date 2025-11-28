import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchProductDetail } from '@/lib/providers/detail';
import { getRateLimiter } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

// Global scraping queue to limit concurrent operations
const scrapingQueue = new Map<string, Promise<any>>();
const MAX_CONCURRENT_SCRAPES = 5;

// Cache to prevent redundant scrapes (5 minute TTL)
const scrapeCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 300 scrape requests per minute (increased for bulk operations)
    const limiter = getRateLimiter('rescrape-api', { capacity: 300, refillRate: 300/60 });
    if (!limiter.tryRemoveTokens(1)) {
      return NextResponse.json({ error: 'Too many scrape requests, please slow down' }, { status: 429 });
    }

    const { listingId, force } = await req.json();
    
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
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Re-scrape] ${listing.title} - ${listing.url}`);
    }
    
    // Check cache first (unless force=true)
    if (!force) {
      const cached = scrapeCache.get(listing.url);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Re-scrape] Using cached result (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
        }
        return NextResponse.json({
          ...cached.data,
          fromCache: true
        });
      }
    }
    
    // Check if already scraping this URL
    if (scrapingQueue.has(listing.url)) {
      return NextResponse.json({ 
        success: false,
        error: 'Already scraping this URL',
        listingId: listing.id
      }, { status: 429 });
    }
    
    // Limit concurrent scrapes
    if (scrapingQueue.size >= MAX_CONCURRENT_SCRAPES) {
      return NextResponse.json({ 
        success: false,
        error: 'Server busy, too many concurrent scrapes. Please try again.',
        listingId: listing.id,
        queueSize: scrapingQueue.size
      }, { status: 503 });
    }
    
    // Add to queue and scrape
    const scrapePromise = fetchProductDetail(listing.url)
      .finally(() => scrapingQueue.delete(listing.url));
    
    scrapingQueue.set(listing.url, scrapePromise);
    const detail = await scrapePromise;
    
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
    
    const response = {
      success: true,
      listingId: listing.id,
      title: listing.title,
      attributes: attrCount,
      priceTiers: tierCount,
      debugSource: detail.debugSource || 'normal',
      quality: attrCount >= 10 ? 'good' : attrCount > 0 ? 'partial' : 'bad'
    };
    
    // Cache the result
    scrapeCache.set(listing.url, {
      timestamp: Date.now(),
      data: response
    });
    
    // Clean old cache entries periodically
    if (scrapeCache.size > 100) {
      const now = Date.now();
      for (const [url, entry] of scrapeCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
          scrapeCache.delete(url);
        }
      }
    }
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('[Re-scrape error]', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
