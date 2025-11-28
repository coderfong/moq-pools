// Fix products with invalid image data (just "jpg", "png", etc. instead of proper URLs)
const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();

async function main() {
  console.log('Finding products with invalid images...');
  
  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      imagesJson: true,
    }
  });
  
  let fixed = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      if (!product.imagesJson) continue;
      
      const images = JSON.parse(product.imagesJson);
      if (!Array.isArray(images) || images.length === 0) continue;
      
      // Check if first image is just an extension or invalid
      const firstImage = images[0];
      if (typeof firstImage === 'string' && 
          (firstImage === 'jpg' || firstImage === 'png' || firstImage === 'jpeg' || 
           firstImage === 'webp' || firstImage.match(/^[a-z]{3,4}$/))) {
        
        console.log(`Fixing product ${product.id}: "${product.title}" - invalid image: "${firstImage}"`);
        
        // Set to empty array to use fallback image
        await prisma.product.update({
          where: { id: product.id },
          data: { imagesJson: JSON.stringify([]) }
        });
        
        fixed++;
      }
    } catch (err) {
      console.error(`Error processing product ${product.id}:`, err.message);
      errors++;
    }
  }
  
  console.log(`\nComplete! Fixed: ${fixed}, Errors: ${errors}, Total checked: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
