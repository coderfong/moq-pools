const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));

// Get a sample listing
prisma.savedListing.findFirst({ 
  where: { platform: 'ALIBABA' } 
}).then(l => {
  if (l) {
    console.log('\nSample SavedListing fields:', Object.keys(l));
    console.log('\nSample data:');
    console.log(JSON.stringify(l, null, 2));
  }
}).finally(() => prisma.$disconnect());
