/**
 * Quick deployment check before pushing to Vercel
 */

const fs = require('fs').promises;
const path = require('path');

async function checkDeploymentReadiness() {
  console.log('🔍 Checking deployment readiness...\n');
  
  const checks = [];
  
  // Check 1: Cache folder
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'cache');
    const files = await fs.readdir(cacheDir);
    const imageFiles = files.filter(f => 
      f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
    );
    
    const cacheSizeBytes = await getCacheSize(cacheDir);
    const cacheSizeMB = (cacheSizeBytes / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Cache folder: ${imageFiles.length} images (${cacheSizeMB} MB)`);
    
    if (cacheSizeMB > 250) {
      console.log(`⚠️  WARNING: Cache is ${cacheSizeMB} MB (Vercel limit: 250 MB)`);
      console.log(`   You'll need to use external CDN for Vercel deployment`);
      checks.push(false);
    } else {
      checks.push(true);
    }
  } catch (error) {
    console.log(`❌ Cache folder missing: ${error.message}`);
    checks.push(false);
  }
  
  // Check 2: .env file
  try {
    await fs.access('.env.local');
    console.log(`✅ Environment file: .env.local exists`);
    checks.push(true);
  } catch {
    console.log(`⚠️  No .env.local file (needed for local testing)`);
  }
  
  // Check 3: Build
  try {
    await fs.access('.next');
    console.log(`✅ Build folder: .next exists`);
    checks.push(true);
  } catch {
    console.log(`⚠️  No build folder (run 'pnpm build' first)`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  
  if (checks.every(c => c)) {
    console.log(`\n✨ Ready to deploy!`);
    console.log(`\nDeployment options:`);
    console.log(`   1. Vercel (if cache < 250MB): pnpm vercel deploy`);
    console.log(`   2. Self-host: Install Docker Desktop and use docker-compose`);
    console.log(`   3. CDN: Upload cache to S3/R2 and update paths\n`);
  } else {
    console.log(`\n⚠️  Some checks failed. Review warnings above.`);
  }
}

async function getCacheSize(dir) {
  const files = await fs.readdir(dir);
  let totalSize = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);
    totalSize += stats.size;
  }
  
  return totalSize;
}

checkDeploymentReadiness();
