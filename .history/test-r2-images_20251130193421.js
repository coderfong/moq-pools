/**
 * Test R2 uploaded images
 */

require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_PUBLIC_URL) {
  console.log('❌ R2_PUBLIC_URL not set in .env.local');
  process.exit(1);
}

// Test a few random image URLs
const testImages = [
  '000133159246b3ac057650cc90589dcb7d0f6d08.jpg',
  '000191b8c179b93cb225fd4c2988b41c4497f2bc.jpg',
  '00027408266639767fdd0a401173dbc537de4e5f.jpg',
  'e186fc621035f4c6919ede962d2ae332433908a4.webp',
  'e189a0b8652e56a67b57cb4d8e6d8cdf3c5b2ec3.webp'
];

async function testR2Images() {
  console.log(`\n🌐 Testing R2 images at: ${R2_PUBLIC_URL}\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const filename of testImages) {
    const url = `${R2_PUBLIC_URL}/cache/${filename}`;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        console.log(`✅ ${filename} - ${response.status} (${response.headers.get('content-length')} bytes)`);
        success++;
      } else {
        console.log(`❌ ${filename} - ${response.status} ${response.statusText}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${filename} - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${success}/${testImages.length}`);
  console.log(`   ❌ Failed: ${failed}/${testImages.length}`);
  
  if (success > 0) {
    console.log(`\n✨ R2 images are working!`);
    console.log(`\n🔗 Test URL in browser:`);
    console.log(`   ${R2_PUBLIC_URL}/cache/${testImages[0]}`);
    console.log(`\n💡 To use in production, update database with:`);
    console.log(`   UPDATE "SavedListing" SET "image" = REPLACE("image", '/cache/', '${R2_PUBLIC_URL}/cache/')`);
    console.log(`   WHERE "platform" = 'ALIBABA' AND "image" LIKE '/cache/%';\n`);
  } else {
    console.log(`\n⚠️  Upload may not be complete or R2 public access not enabled.`);
    console.log(`   Check Cloudflare R2 dashboard → Settings → Public Access\n`);
  }
}

testR2Images();
