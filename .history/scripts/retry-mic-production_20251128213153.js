const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// ====== PRODUCTION CONFIGURATION ======
const PRODUCTION_MODE = process.env.NODE_ENV === 'production';
const API_BASE_URL = process.env.DEPLOY_API_URL || process.env.API_BASE_URL || 'http://localhost:3007';
const API_URL = `${API_BASE_URL}/api/rescrape`;

console.log(`🌐 Running in ${PRODUCTION_MODE ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`🔗 API Endpoint: ${API_URL}`);

// Initialize Prisma with environment-specific configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const BATCH_SIZE = PRODUCTION_MODE ? 3 : 5; // Smaller batches in production
const DELAY_BETWEEN_BATCHES = PRODUCTION_MODE ? 12000 : 8000; // Longer delays in production
const PROGRESS_FILE = path.join(__dirname, 'mic-retry-progress.json');
const MAX_CONSECUTIVE_FALLBACKS = 5;
const BLOCK_COOLDOWN_MS = PRODUCTION_MODE ? 180000 : 120000; // 3 minutes in production
const MAX_CONCURRENT_REQUESTS = 1;
const RATE_LIMIT_BACKOFF = PRODUCTION_MODE ? 15000 : 10000; // 15 seconds in production
const MAX_RETRIES_PER_ITEM = 2;

// Authentication for production
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'jonfong78@gmail.com',
  password: process.env.ADMIN_PASSWORD
};

// Session management for production
let sessionCookies = '';

async function authenticateForProduction() {
  if (!PRODUCTION_MODE || !ADMIN_CREDENTIALS.password) {
    console.log('📝 Skipping authentication (development mode or no admin password)');
    return;
  }

  console.log('🔐 Authenticating with production server...');
  
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    if (loginResponse.ok) {
      const cookieHeader = loginResponse.headers.get('set-cookie');
      if (cookieHeader) {
        sessionCookies = cookieHeader;
        console.log('✅ Authentication successful');
      }
    } else {
      console.error('❌ Authentication failed:', loginResponse.status);
      console.log('💡 Make sure ADMIN_PASSWORD environment variable is set');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    console.log('💡 Make sure your production server is running and accessible');
    process.exit(1);
  }
}

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      console.log(`📂 Resuming from previous retry session...`);
      return data;
    }
  } catch (err) {
    console.log('⚠️  Could not load progress file, starting fresh');
  }
  return { 
    offset: 0, 
    good: 0, 
    partial: 0, 
    bad: 0, 
    errors: 0, 
    skipped: 0,
    retryAttempts: {}
  };
}

// Save progress
function saveProgress(data) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('⚠️  Could not save progress:', err.message);
  }
}

async function makeRequest(url, options = {}) {
  const headers = {
    'User-Agent': 'MOQ-Pools-MIC-Ingestion-Script/1.0',
    ...options.headers
  };

  // Add authentication for production
  if (PRODUCTION_MODE && sessionCookies) {
    headers['Cookie'] = sessionCookies;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    timeout: 90000
  });

  return response;
}

async function retryProblematicListings() {
  console.log('=== RETRYING PROBLEMATIC MADE-IN-CHINA LISTINGS ===\n');
  console.log(`🌐 Environment: ${PRODUCTION_MODE ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log('🎯 Targeting: Errors (0 attrs with error), Bad (0 attrs), Partial (1-9 attrs)\n');
  
  // Authenticate if in production
  await authenticateForProduction();

  const progress = loadProgress();
  console.log(`📊 Starting from offset: ${progress.offset}`);
  console.log(`📈 Previous: ${progress.good} good, ${progress.partial} partial, ${progress.bad} bad, ${progress.errors} errors\n`);

  const startTime = Date.now();
  let consecutiveFallbacks = 0;
  let lastBlockTime = 0;

  try {
    while (true) {
      // Check for block cooldown
      if (Date.now() - lastBlockTime < BLOCK_COOLDOWN_MS) {
        const remaining = Math.ceil((BLOCK_COOLDOWN_MS - (Date.now() - lastBlockTime)) / 1000);
        console.log(`❄️  In cooldown period, ${remaining}s remaining...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Get problematic listings
      const problematic = await prisma.savedListing.findMany({
        where: {
          platform: 'MADE_IN_CHINA',
          OR: [
            { attributesCount: { lte: 9 } }, // Bad or partial
            { detailJson: { path: ['error'], not: null } } // Has error
          ]
        },
        select: { id: true, title: true, attributesCount: true, url: true, detailJson: true },
        orderBy: { createdAt: 'desc' },
        skip: progress.offset,
        take: 50
      });

      if (problematic.length === 0) {
        console.log('🏁 No more problematic listings found');
        break;
      }

      console.log(`📦 Processing batch: ${progress.offset + 1}-${progress.offset + problematic.length}`);

      for (let i = 0; i < problematic.length; i += BATCH_SIZE) {
        const batch = problematic.slice(i, i + BATCH_SIZE);
        
        console.log(`\n🔄 Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)`);
        
        for (const listing of batch) {
          const retryKey = listing.id;
          const attempts = progress.retryAttempts[retryKey] || 0;
          
          if (attempts >= MAX_RETRIES_PER_ITEM) {
            console.log(`  ⏭️  ${listing.title?.substring(0, 40)}... (max retries)`);
            progress.skipped++;
            progress.offset++;
            continue;
          }

          const hasError = listing.detailJson?.error;
          const attrs = listing.attributesCount || 0;
          console.log(`  🔍 ${listing.title?.substring(0, 40)}... (${attrs} attrs${hasError ? ', has error' : ''}) [attempt ${attempts + 1}]`);
          
          try {
            const response = await makeRequest(`${API_URL}?id=${listing.id}&force=1&headless=1`);
            
            if (!response.ok) {
              if (response.status === 429) {
                console.log('    ⚠️  Rate limit - backing off');
                await new Promise(r => setTimeout(r, RATE_LIMIT_BACKOFF));
                continue;
              }
              
              throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            progress.retryAttempts[retryKey] = attempts + 1;
            
            if (data.success && data.data) {
              const newAttrs = data.data.attributes || 0;
              
              if (newAttrs >= 10) {
                console.log(`    🎉 GOOD: ${attrs} → ${newAttrs} attributes`);
                progress.good++;
                consecutiveFallbacks = 0;
              } else if (newAttrs > 0) {
                console.log(`    📈 PARTIAL: ${attrs} → ${newAttrs} attributes`);
                progress.partial++;
                consecutiveFallbacks = 0;
              } else {
                console.log(`    😞 Still bad: ${newAttrs} attributes`);
                progress.bad++;
                consecutiveFallbacks++;
              }
            } else {
              console.log(`    ❌ Failed: ${data.error || 'Unknown error'}`);
              progress.errors++;
              consecutiveFallbacks++;
            }
          } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
            progress.errors++;
            progress.retryAttempts[retryKey] = attempts + 1;
            consecutiveFallbacks++;
          }
          
          progress.offset++;

          // Check for blocks
          if (consecutiveFallbacks >= MAX_CONSECUTIVE_FALLBACKS) {
            console.log(`\n🛑 Too many consecutive fallbacks (${consecutiveFallbacks}), entering cooldown...`);
            lastBlockTime = Date.now();
            consecutiveFallbacks = 0;
            break;
          }
        }

        // Save progress and delay between batches
        saveProgress(progress);
        
        if (lastBlockTime === 0) { // Only delay if not in cooldown
          console.log(`⏳ Batch delay: ${DELAY_BETWEEN_BATCHES}ms`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        } else {
          break; // Exit to outer loop to handle cooldown
        }
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('💾 Progress saved, you can resume later');
  } finally {
    saveProgress(progress);
    await prisma.$disconnect();
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ MIC retry completed in ${elapsed} minutes`);
  console.log(`📊 Final stats:`);
  console.log(`  🎉 ${progress.good} good (≥10 attrs)`);
  console.log(`  📈 ${progress.partial} partial (1-9 attrs)`);
  console.log(`  😞 ${progress.bad} still bad (0 attrs)`);
  console.log(`  ❌ ${progress.errors} errors`);
  console.log(`  ⏭️  ${progress.skipped} skipped (max retries)`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏸️  Received interrupt signal');
  console.log('💾 Saving progress...');
  process.exit(0);
});

retryProblematicListings().catch(console.error);