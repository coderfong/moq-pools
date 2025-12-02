const { PrismaClient } = require('./prisma/generated/client4');
require('dotenv').config({ path: '.env.local' });

async function deleteListingsWithoutImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 Checking listings without images...\n');
    
    // Check counts by platform
    const platforms = ['ALIBABA', 'MADE_IN_CHINA', 'INDIAMART'];
    
    for (const platform of platforms) {
      const count = await prisma.savedListing.count({
        where: {
          platform,
          OR: [
            { image: null },
            { image: '' }
          ]
        }
      });
      
      if (count > 0) {
        console.log(`${platform}: ${count} listings without images`);
      }
    }
    
    // Get total count
    const totalWithoutImages = await prisma.savedListing.count({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    });
    
    console.log(`\nTotal listings without images: ${totalWithoutImages}\n`);
    
    if (totalWithoutImages === 0) {
      console.log('✅ No listings found without images!');
      return;
    }
    
    // Show some samples
    console.log('📋 Sample listings that will be deleted:\n');
    const samples = await prisma.savedListing.findMany({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      },
      select: { 
        id: true, 
        title: true, 
        url: true, 
        platform: true,
        image: true 
      },
      take: 10
    });
    
    samples.forEach((s, i) => {
      console.log(`${i+1}. [${s.platform}] ${s.title.substring(0, 50)}...`);
      console.log(`   URL: ${s.url.substring(0, 70)}...`);
      console.log(`   Image: ${s.image || 'NULL'}\n`);
    });
    
    // Check if --dry-run flag is passed
    if (!process.argv.includes('--delete')) {
      console.log('⚠️  DRY RUN MODE - No deletions performed');
      console.log('\nTo actually delete these listings, run:');
      console.log('  node delete-listings-no-images.js --delete\n');
      return;
    }
    
    // Perform the deletion
    console.log(`🗑️  Deleting ${totalWithoutImages} listings without images...\n`);
    
    const result = await prisma.savedListing.deleteMany({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      }
    });
    
    console.log(`✅ Successfully deleted ${result.count} listings!\n`);
    
    // Show remaining counts by platform
    console.log('📊 Remaining listings by platform:');
    for (const platform of platforms) {
      const count = await prisma.savedListing.count({
        where: { platform }
      });
      if (count > 0) {
        console.log(`  ${platform}: ${count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteListingsWithoutImages();
