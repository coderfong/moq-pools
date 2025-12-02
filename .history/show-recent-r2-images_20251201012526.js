const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function showRecentR2Images() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n📸 Recently added R2 images for Alibaba listings:\n');
    
    // Get Alibaba listings with R2 images, sorted by most recent
    const listings = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        image: { startsWith: R2_PUBLIC_URL }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50, // Show last 50
      select: {
        id: true,
        title: true,
        image: true,
        updatedAt: true,
        url: true
      }
    });
    
    console.log(`Found ${listings.length} recent listings with R2 images:\n`);
    
    listings.forEach((listing, idx) => {
      const timeAgo = Math.round((Date.now() - new Date(listing.updatedAt).getTime()) / 1000 / 60);
      console.log(`${idx + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   ⏱️  Updated: ${timeAgo} minutes ago`);
      console.log(`   🖼️  Image: ${listing.image}`);
      console.log(`   🔗 URL: ${listing.url}`);
      console.log('');
    });
    
    // Also show the one that failed (No Image)
    console.log('\n❌ Listings that still have no image:\n');
    
    const noImage = await prisma.savedListing.findMany({
      where: {
        platform: 'ALIBABA',
        OR: [
          { image: null },
          { image: '' }
        ],
        detailJson: { not: null }
      },
      take: 10,
      select: {
        id: true,
        title: true,
        url: true,
        detailJson: true
      }
    });
    
    noImage.forEach((listing, idx) => {
      console.log(`${idx + 1}. ${listing.title.substring(0, 60)}...`);
      console.log(`   🔗 URL: ${listing.url}`);
      
      // Check what's in detailJson
      const hasHeroImage = listing.detailJson?.heroImage ? '✅' : '❌';
      const hasGallery = listing.detailJson?.gallery?.length > 0 ? `✅ (${listing.detailJson.gallery.length})` : '❌';
      
      console.log(`   heroImage: ${hasHeroImage}`);
      console.log(`   gallery: ${hasGallery}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showRecentR2Images();
