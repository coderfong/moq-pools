const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deactivatePoolProducts() {
  console.log('Deactivating the 2 products with pools...\n');
  
  const productIds = [
    'cmievzk36000n9ehviblwzq6x', // Batter Dispenser
    'cmieynv1x00059l80zd6jxtv8'  // Polar Camera
  ];
  
  for (const id of productIds) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { pool: true }
    });
    
    if (product) {
      console.log(`Deactivating: ${product.title?.substring(0, 70)}`);
      
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
      
      console.log(`  ✅ Deactivated\n`);
    }
  }
  
  console.log('✅ Products deactivated - they will no longer show on browse page\n');
  
  await prisma.$disconnect();
}

deactivatePoolProducts().catch(console.error);
