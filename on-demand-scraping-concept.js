// CONCEPT: Instead of pre-scraping 113K listings,
// scrape details ONLY when user clicks on a listing

// Modify your product detail page to:
// 1. Check if listing has details
// 2. If not, scrape on-demand
// 3. Cache for future views

// Benefits:
// - Only scrape listings people actually view
// - Spreads scraping over time (no bulk blocking)
// - Much less total work
// - Users get fresh data

// Implementation in app/api/listing-detail/route.ts:

const onDemandScrape = async (listingId) => {
  const listing = await prisma.savedListing.findUnique({
    where: { id: listingId }
  });
  
  // Check if details are missing or old
  const needsUpdate = !listing.detailJson || 
    !listing.detailUpdatedAt ||
    (Date.now() - listing.detailUpdatedAt.getTime()) > 7 * 24 * 60 * 60 * 1000; // 7 days
  
  if (needsUpdate) {
    console.log('Scraping details on-demand...');
    const details = await fetchProductDetail(listing.url, listing.platform);
    
    await prisma.savedListing.update({
      where: { id: listingId },
      data: {
        detailJson: details,
        detailUpdatedAt: new Date()
      }
    });
  }
  
  return listing;
};

// This way you only scrape the ~5-10% of listings
// that users actually click on!
