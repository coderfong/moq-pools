#!/usr/bin/env node
/**
 * Fix Alibaba listings by scraping images directly from source URLs
 * For listings with /cache/ paths but no detailJson
 */

const { PrismaClient } = require('./prisma/generated/client4');
const prisma = new PrismaClient();
const cheerio = require('cheerio');

// Rate limiting
const DELAY_MS = 2000; // 2 seconds between requests
const BATCH_SIZE = 10;
const PROGRESS_FILE = 'alibaba-image-fix-progress.json';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeImageFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
      const $ = cheerio.load(html);
      
      // Debug: log first few image URLs found
      if (process.env.DEBUG) {
        console.log('    [DEBUG] Found images:');
        $('img[src*="alicdn.com"]').slice(0, 5).each((i, img) => {
          console.log(`      ${i+1}. ${$(img).attr('src')}`);
        });
      }    // Extract images from the main carousel
    // Based on the HTML structure you provided
    const images = [];
    
    // Collect all product images from the page
    $('img[src*="alicdn.com"]').each((_, img) => {
      const src = $(img).attr('src');
      if (src && 
          src.includes('alicdn.com') && 
          src.match(/\.(jpg|jpeg)($|\?|_)/i) && // Only JPG images
          !src.includes('_80x80') && 
          !src.includes('_50x50') &&
          !src.includes('_120x120') &&
          !src.includes('tps-960-102') &&
          !src.includes('tps-920-110') &&
          !src.match(/tps-\d+-\d+/)) { // Skip all tps banner images
        let cleanSrc = src.startsWith('//') ? 'https:' + src : src;
        
        // Remove size suffixes like _960x960q80.jpg, _350x350.jpg to get original
        // Match pattern: _[numbers]x[numbers][optional q and numbers].jpg
        // Only if the pattern exists (to avoid adding .jpg to .jpg)
        if (cleanSrc.match(/_\d+x\d+q?\d*\.(jpg|jpeg)$/i)) {
          cleanSrc = cleanSrc.replace(/_\d+x\d+q?\d*\.(jpg|jpeg)$/i, '.$1');
        }
        
        // Fix double extensions like .jpg.jpg -> .jpg
        cleanSrc = cleanSrc.replace(/\.(jpg|jpeg)\.\1$/i, '.$1');
        
        images.push(cleanSrc);
      }
    });
    
    // Return the first best image
    if (images.length > 0) {
      // Deduplicate and prefer images without size suffixes
      const uniqueImages = [...new Set(images)];
      
      if (process.env.DEBUG) {
        console.log(`    [DEBUG] Unique product images found: ${uniqueImages.length}`);
        uniqueImages.slice(0, 3).forEach((img, i) => {
          console.log(`      ${i+1}. ${img}`);
        });
      }
      
      // Priority: @sc04.alicdn.com/kf/ or sc04.alicdn.com/kf/ images (product images) > others
      const best = uniqueImages.find(img => img.includes('.alicdn.com/@sc04/kf/') && !img.match(/_\d+x\d+/)) ||
                   uniqueImages.find(img => img.includes('sc04.alicdn.com/kf/') && !img.match(/_\d+x\d+/)) ||
                   uniqueImages.find(img => img.includes('s.alicdn.com/@sc') && !img.match(/_\d+x\d+/)) ||
                   uniqueImages.find(img => !img.match(/_\d+x\d+/)) ||
                   uniqueImages.find(img => img.includes('_350x350')) ||
                   uniqueImages[0];
      
      if (process.env.DEBUG && best) {
        console.log(`    [DEBUG] Selected: ${best}`);
      }
      
      return best;
    }
    
    return null;
  } catch (error) {
    console.error(`    Error scraping: ${error.message}`);
    return null;
  }
}

function loadProgress() {
  try {
    const fs = require('fs');
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      // Ensure all required fields exist
      return {
        processed: Array.isArray(data.processed) ? data.processed : [],
        fixed: data.fixed || 0,
        failed: data.failed || 0,
        errors: data.errors || 0
      };
    }
  } catch (e) {
    console.error('Could not load progress:', e.message);
  }
  return { processed: [], fixed: 0, failed: 0, errors: 0 };
}

function saveProgress(progress) {
  try {
    const fs = require('fs');
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (e) {
    console.error('Could not save progress:', e.message);
  }
}

async function fixAlibabaImagesFromSource(dryRun = false, limit = null) {
  const progress = loadProgress();
  
  if (!progress || !progress.processed) {
    console.error('FATAL: Failed to initialize progress object');
    console.error('Progress:', progress);
    process.exit(1);
  }
  
  try {
    console.log('='.repeat(80));
    console.log(dryRun ? 'DRY RUN: SCRAPING ALIBABA IMAGES FROM SOURCE' : 'SCRAPING ALIBABA IMAGES FROM SOURCE');
    console.log('='.repeat(80));
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE: No database changes will be made\n');
    }
    if (progress.processed.length > 0) {
      console.log(`📂 Resuming from previous run (${progress.processed.length} already processed)\n`);
    }
    
    // Find Alibaba listings with /cache/ images
    const query = {
      where: {
        platform: 'ALIBABA',
        image: { startsWith: '/cache/' },
        url: { not: '' }
      },
      select: {
        id: true,
        url: true,
        title: true,
        image: true,
      }
    };
    
    if (limit) {
      query.take = limit;
    }
    
    let listings = await prisma.savedListing.findMany(query);
    
    // Filter out already processed listings
    if (progress.processed.length > 0 && !dryRun) {
      const processedSet = new Set(progress.processed);
      listings = listings.filter(l => !processedSet.has(l.id));
    }
    
    console.log(`\nFound ${listings.length} Alibaba listings to fix${limit ? ` (limited to ${limit})` : ''}\n`);
    
    if (listings.length === 0) {
      console.log('No listings to fix!');
      return;
    }
    
    let fixed = progress.fixed;
    let failed = progress.failed;
    let errors = progress.errors;
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const progress = `[${i + 1}/${listings.length}]`;
      
      console.log(`${progress} ${listing.title.substring(0, 60)}...`);
      console.log(`  Current: ${listing.image}`);
      console.log(`  Source: ${listing.url}`);
      
      try {
        // Scrape image from source URL
        const imageUrl = await scrapeImageFromUrl(listing.url);
        
        if (!imageUrl) {
          console.log(`  ❌ Could not extract image from source`);
          failed++;
          if (!dryRun && progress) {
            progress.processed.push(listing.id);
            progress.failed = failed;
          }
          await sleep(DELAY_MS);
          continue;
        }
        
        if (dryRun) {
          console.log(`  ✅ Would update to: ${imageUrl}`);
          fixed++;
        } else {
          // Update database
          await prisma.savedListing.update({
            where: { id: listing.id },
            data: { image: imageUrl }
          });
          
          console.log(`  ✅ Fixed: ${imageUrl}`);
          fixed++;
          
          // Save progress
          if (progress) {
            progress.processed.push(listing.id);
            progress.fixed = fixed;
          }
        }
        
        // Rate limiting
        await sleep(DELAY_MS);
        
        // Progress checkpoint every batch
        if ((i + 1) % BATCH_SIZE === 0) {
          console.log(`\n--- Progress: ${i + 1}/${listings.length} (${fixed} fixed, ${failed} failed) ---\n`);
          if (!dryRun) {
            saveProgress(progress);
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        if (process.env.DEBUG) {
          console.error(`     Stack: ${error.stack}`);
        }
        errors++;
        await sleep(DELAY_MS);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Failed to extract: ${failed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

if (dryRun) {
  console.log('Running in DRY RUN mode. Use without --dry-run to apply changes.');
}
if (limit) {
  console.log(`Limited to ${limit} listings.\n`);
}

fixAlibabaImagesFromSource(dryRun, limit);
