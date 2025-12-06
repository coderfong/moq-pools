import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const savedListingId = searchParams.get('savedListingId');

    console.log('[Pool Progress API] Request for:', savedListingId);

    if (!savedListingId) {
      return NextResponse.json({ error: 'savedListingId required' }, { status: 400 });
    }

    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Find the saved listing with MOQ data
    const savedListing = await (prisma as any).savedListing.findUnique({
      where: { id: savedListingId }
    });

    console.log('[Pool Progress API] Found listing:', !!savedListing);

    if (!savedListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Extract MOQ using the same normalization logic as the pool page
    let moqValue = 100; // Default fallback
    
    // Try direct MOQ field first
    if (savedListing.moq) {
      moqValue = savedListing.moq;
      console.log('[Pool Progress API] Using listing.moq:', moqValue);
    }
    // Try parsing moqRaw field
    else if (savedListing.moqRaw) {
      const match = String(savedListing.moqRaw).match(/(\d+)/);
      if (match) {
        moqValue = parseInt(match[1], 10);
        console.log('[Pool Progress API] Parsed moqRaw:', savedListing.moqRaw, '→', moqValue);
      }
    }
    // Try detailJson next
    if (savedListing.detailJson) {
      try {
        const detailData = typeof savedListing.detailJson === 'string' 
          ? JSON.parse(savedListing.detailJson) 
          : savedListing.detailJson;
        
        // Try to get MOQ from detailJson.moq
        if (detailData?.moq) {
          moqValue = Number(detailData.moq);
          console.log('[Pool Progress API] Using detailJson.moq:', moqValue);
        }
        // If no direct MOQ, extract from first price tier
        else if (detailData?.priceTiers && detailData.priceTiers.length > 0) {
          const firstTier = detailData.priceTiers[0];
          if (firstTier?.range) {
            // Extract first number from range (e.g., "50-99" -> 50, "≥ 100" -> 100)
            const match = String(firstTier.range).match(/(\d+)/);
            if (match) {
              moqValue = parseInt(match[1], 10);
              console.log('[Pool Progress API] Extracted MOQ from first tier:', moqValue);
            }
          }
        }
      } catch (err) {
        console.error('[Pool Progress API] Error parsing detailJson:', err);
      }
    }
    // Use normalizeDetail logic when no detailJson
    else {
      try {
        const { normalizeDetail } = await import('@/lib/detail-contract');
        const normalized = normalizeDetail(
          {},
          {
            title: savedListing.title || '',
            priceRaw: savedListing.priceRaw,
            priceMin: savedListing.priceMin,
            priceMax: savedListing.priceMax,
            currency: savedListing.currency,
            ordersRaw: savedListing.ordersRaw,
            image: savedListing.image,
          }
        );
        
        // Extract MOQ from normalized data
        if (normalized.moq && normalized.moq > 1) {
          moqValue = normalized.moq;
          console.log('[Pool Progress API] Using normalized.moq:', moqValue);
        } else if (normalized.priceTiers && normalized.priceTiers.length > 0) {
          const firstTier = normalized.priceTiers[0];
          if (firstTier?.range) {
            const match = String(firstTier.range).match(/(\d+)/);
            if (match) {
              moqValue = parseInt(match[1], 10);
              console.log('[Pool Progress API] Extracted MOQ from normalized tier:', moqValue);
            }
          }
        }
      } catch (err) {
        console.error('[Pool Progress API] Error normalizing detail:', err);
      }
    }

    console.log('[Pool Progress API] Final MOQ value:', moqValue);

    // Find the product and pool based on sourceUrl
    const product = await (prisma as any).product.findFirst({
      where: { sourceUrl: savedListing.url },
      include: {
        pool: true
      }
    });

    console.log('[Pool Progress API] Found product:', !!product, 'Pool:', !!product?.pool);

    if (!product?.pool) {
      // Return default values if no pool exists yet, using actual MOQ
      console.log('[Pool Progress API] No pool, returning defaults with MOQ:', moqValue);
      return NextResponse.json({
        pledgedQty: 0,
        targetQty: moqValue,
        status: 'FORMING',
        moqReachedAt: null,
        deadlineAt: null
      });
    }

    const result = {
      pledgedQty: product.pool.pledgedQty,
      targetQty: product.pool.targetQty,
      status: product.pool.status,
      moqReachedAt: product.pool.moqReachedAt,
      deadlineAt: product.pool.deadlineAt
    };

    console.log('[Pool Progress API] Returning:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Pool Progress API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
