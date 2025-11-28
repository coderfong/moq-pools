const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTableStructure() {
  try {
    // Check Product table columns
    const productColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Product'
      ORDER BY ordinal_position;
    `;
    console.log('Product table columns:', productColumns);

    // Check Pool table columns  
    const poolColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Pool'
      ORDER BY ordinal_position;
    `;
    console.log('Pool table columns:', poolColumns);

    // Check if we have any products
    const products = await prisma.product.findMany({ take: 1 });
    console.log('Sample product:', products[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();