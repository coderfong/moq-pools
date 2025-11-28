import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshProductDetail } from '@/lib/providers/detail';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (action === 'analyze') {
      // Find all Alibaba listings and classify them
      const allAlibaba = await prisma.savedListing.findMany({
        where: { platform: 'ALIBABA' },
        select: {
          id: true,
          url: true,
          title: true,
          detailJson: true
        }
      });
      
      const needsFix = [];
      const good = [];
      
      for (const listing of allAlibaba) {
        if (!listing.detailJson) {
          needsFix.push({ id: listing.id, reason: 'No detailJson' });
          continue;
        }
        
        const detail = listing.detailJson as any;
        const hasAttributes = detail.attributes && detail.attributes.length > 0;
        const hasPriceTiers = detail.priceTiers && detail.priceTiers.length > 0;
        const hasSupplier = detail.supplier && detail.supplier.name;
        const hasHtmlSuffix = listing.title && /\d{8,}\.html?\s*$/i.test(listing.title);
        
        if (!hasAttributes || !hasPriceTiers || !hasSupplier || hasHtmlSuffix) {
          needsFix.push({
            id: listing.id,
            title: listing.title?.substring(0, 60),
            reason: [
              !hasAttributes && 'no attributes',
              !hasPriceTiers && 'no price tiers',
              !hasSupplier && 'no supplier',
              hasHtmlSuffix && 'bad title'
            ].filter(Boolean).join(', ')
          });
        } else {
          good.push(listing.id);
        }
      }
      
      return NextResponse.json({
        total: allAlibaba.length,
        good: good.length,
        needsFix: needsFix.length,
        samples: needsFix.slice(0, 20)
      });
    }
    
    if (action === 'fix') {
      // Get listings that need fixing
      const allAlibaba = await prisma.savedListing.findMany({
        where: { platform: 'ALIBABA' },
        select: {
          id: true,
          url: true,
          title: true,
          priceRaw: true,
          priceMin: true,
          priceMax: true,
          currency: true,
          ordersRaw: true,
          image: true,
          detailJson: true,
          detailUpdatedAt: true
        },
        take: limit
      });
      
      const needsFix = [];
      
      for (const listing of allAlibaba) {
        if (!listing.detailJson) {
          needsFix.push(listing);
          continue;
        }
        
        const detail = listing.detailJson as any;
        const hasAttributes = detail.attributes && detail.attributes.length > 0;
        const hasPriceTiers = detail.priceTiers && detail.priceTiers.length > 0;
        const hasSupplier = detail.supplier && detail.supplier.name;
        
        if (!hasAttributes || !hasPriceTiers || !hasSupplier) {
          needsFix.push(listing);
        }
      }
      
      const results = [];
      
      for (const listing of needsFix) {
        try {
          const detail = await refreshProductDetail(listing);
          
          if (detail && detail.attributes && detail.attributes.length > 0) {
            results.push({
              id: listing.id,
              status: 'success',
              attributes: detail.attributes.length,
              priceTiers: detail.priceTiers?.length || 0,
              supplier: detail.supplier?.name || null
            });
          } else {
            results.push({
              id: listing.id,
              status: 'weak',
              message: 'Got minimal data'
            });
          }
        } catch (error: any) {
          results.push({
            id: listing.id,
            status: 'error',
            message: error.message
          });
        }
      }
      
      return NextResponse.json({
        processed: results.length,
        results
      });
    }
    
    return NextResponse.json({ error: 'Invalid action. Use ?action=analyze or ?action=fix&limit=10' }, { status: 400 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
