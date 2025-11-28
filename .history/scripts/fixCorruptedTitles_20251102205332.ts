import { prisma } from '../src/lib/prisma';

async function fixCorruptedTitles() {
  if (!prisma) throw new Error('Prisma not available');
  
  // Find all listings with titles that end with .html (corrupted format)
  const listings = await prisma.savedListing.findMany({
    where: {
      title: { endsWith: '.html' }
    },
    select: { id: true, title: true, url: true }
  });
  
  console.log(`Found ${listings.length} listings with corrupted titles`);
  
  let fixed = 0;
  for (const listing of listings) {
    // Extract clean title by removing the product ID and .html extension
    // Example: "Wholesale Walker Ultra Hold Glue Hair 1601369025072.html" 
    // -> "Wholesale Walker Ultra Hold Glue Hair"
    const cleaned = listing.title
      .replace(/_?\d+\.html$/i, '') // Remove _ID.html or ID.html
      .replace(/[-_]+$/g, '') // Remove trailing dashes/underscores
      .trim();
    
    if (cleaned && cleaned !== listing.title) {
      await prisma.savedListing.update({
        where: { id: listing.id },
        data: { title: cleaned }
      });
      console.log(`✓ Fixed: "${listing.title}" -> "${cleaned}"`);
      fixed++;
    }
  }
  
  console.log(`\n✓ Fixed ${fixed} corrupted titles`);
  await prisma.$disconnect();
}

fixCorruptedTitles().catch(console.error);
