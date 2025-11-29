/**
 * Upload cache images to Cloudflare R2 and update database
 * R2 is free for first 10GB storage + 10M reads/month
 */

const { PrismaClient } = require('./prisma/generated/client4');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

// Get R2 credentials from environment
// Create R2 bucket at: https://dash.cloudflare.com/r2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'moq-pools-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://images.yoursite.com

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🚀 Upload cache to Cloudflare R2\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No actual changes\n');
  }
  
  // Validate environment
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.log('❌ Missing R2 credentials in environment:');
    console.log('   Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    console.log('\n📝 Setup instructions:');
    console.log('   1. Go to: https://dash.cloudflare.com/');
    console.log('   2. Navigate to R2 → Create Bucket → "moq-pools-images"');
    console.log('   3. Go to R2 → Manage R2 API Tokens → Create API Token');
    console.log('   4. Add credentials to .env.local:');
    console.log('      R2_ACCOUNT_ID=your_account_id');
    console.log('      R2_ACCESS_KEY_ID=your_access_key');
    console.log('      R2_SECRET_ACCESS_KEY=your_secret_key');
    console.log('      R2_PUBLIC_URL=https://pub-xxx.r2.dev (from R2 bucket settings)');
    console.log('\n   5. Enable public access for the bucket\n');
    return;
  }
  
  // Initialize R2 client
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  
  console.log(`📦 Target bucket: ${R2_BUCKET_NAME}`);
  console.log(`🌐 Public URL: ${R2_PUBLIC_URL || 'Not set'}\n`);
  
  // Get cache directory
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  const files = await fs.readdir(cacheDir);
  const imageFiles = files.filter(f => 
    f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
  );
  
  console.log(`📊 Found ${imageFiles.length} images to upload\n`);
  
  let uploaded = 0;
  let failed = 0;
  let updated = 0;
  
  // Upload in batches
  const batchSize = 50;
  for (let i = 0; i < imageFiles.length; i += batchSize) {
    const batch = imageFiles.slice(i, i + batchSize);
    
    console.log(`[${i + 1}-${Math.min(i + batchSize, imageFiles.length)}/${imageFiles.length}] Uploading batch...`);
    
    for (const filename of batch) {
      try {
        const filePath = path.join(cacheDir, filename);
        const fileContent = await fs.readFile(filePath);
        
        // Upload to R2
        if (!DRY_RUN) {
          await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `cache/${filename}`,
            Body: fileContent,
            ContentType: filename.endsWith('.jpg') ? 'image/jpeg' : 
                        filename.endsWith('.png') ? 'image/png' : 'image/webp',
          }));
        }
        
        uploaded++;
        
        if (uploaded % 100 === 0) {
          console.log(`  ✅ Uploaded ${uploaded}/${imageFiles.length}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed: ${filename} - ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n📈 Upload complete:`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (!DRY_RUN && R2_PUBLIC_URL) {
    console.log(`\n🔄 Updating database paths...`);
    
    // Update database to use R2 URLs
    const result = await prisma.$executeRaw`
      UPDATE "SavedListing"
      SET "image" = REPLACE("image", '/cache/', ${R2_PUBLIC_URL + '/cache/'})
      WHERE "platform" = 'ALIBABA' 
      AND "image" LIKE '/cache/%'
    `;
    
    console.log(`   ✅ Updated ${result} listings\n`);
    
    console.log(`✨ Done! Images now served from: ${R2_PUBLIC_URL}/cache/\n`);
  } else {
    console.log(`\n💡 Next step: Run without --dry-run to update database paths\n`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
