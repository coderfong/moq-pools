const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// ====== PRODUCTION CONFIGURATION ======
// Set these for your deployed environment
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

const BATCH_SIZE = PRODUCTION_MODE ? 2 : 3; // Smaller batches in production
const DELAY_BETWEEN_BATCHES = PRODUCTION_MODE ? 15000 : 10000; // Longer delays in production
const PROGRESS_FILE = path.join(__dirname, 'alibaba-retry-progress.json');
const MAX_RETRIES_PER_LISTING = 2;
const REQUEST_TIMEOUT = PRODUCTION_MODE ? 120000 : 90000; // 2 min in production
const INTER_CHUNK_DELAY = PRODUCTION_MODE ? 5000 : 3000;

// Authentication for production
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'jonfong78@gmail.com',
  password: process.env.ADMIN_PASSWORD
};

// Categories to retry
const RETRY_CATEGORIES = {
  PARTIAL: { min: 1, max: 9, label: 'Partial (1-9 attributes)' },
  BAD: { min: 0, max: 0, label: 'Bad (0 attributes)' },
  MISSING: { min: null, max: null, label: 'Missing detailJson' }
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
      console.log(`📂 Resuming from previous session...`);
      return data;
    }
  } catch (err) {
    console.log('⚠️  Could not load progress file, starting fresh');
  }
  return { 
    offset: 0, 
    improved: 0, 
    unchanged: 0, 
    stillBad: 0, 
    errors: 0,
    category: 'PARTIAL',
    retryCount: {}
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
    'User-Agent': 'MOQ-Pools-Ingestion-Script/1.0',
    ...options.headers
  };

  // Add authentication for production
  if (PRODUCTION_MODE && sessionCookies) {
    headers['Cookie'] = sessionCookies;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    timeout: REQUEST_TIMEOUT
  });

  return response;
}

async function rescrapeAlibabaListing(listingId) {
  const url = `${API_URL}?id=${listingId}&force=1&headless=1`;
  
  try {
    const response = await makeRequest(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log('    ⚠️  Rate limited - waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second wait for production
        return { success: false, rateLimited: true };
      }
      
      console.log(`    ❌ HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (data.success) {
      const attrs = data.data?.attributes || 0;
      console.log(`    ✅ Success! ${attrs} attributes`);
      return { success: true, attributes: attrs, data: data.data };
    } else {
      console.log(`    ❌ API Error: ${data.error || 'Unknown'}`);
      return { success: false, error: data.error || 'API returned success: false' };
    }
  } catch (error) {
    console.log(`    ❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function getProblematicAlibabaListings(category, offset = 0) {
  const batchSize = 50; // Get IDs in batches of 50
  
  try {
    let whereCondition;
    
    if (category === 'MISSING') {
      whereCondition = {
        platform: 'ALIBABA',
        detailJson: null
      };
    } else {
      const { min, max } = RETRY_CATEGORIES[category];
      whereCondition = {
        platform: 'ALIBABA',
        detailJson: { not: null },
        attributesCount: { gte: min, lte: max }
      };
    }

    const listings = await prisma.savedListing.findMany({
      where: whereCondition,
      select: { id: true, title: true, attributesCount: true },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: batchSize
    });

    return listings;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    return [];
  }
}

async function retryAlibabaProblematic() {
  const category = process.argv.find(arg => arg.startsWith('--category='))?.split('=')[1] || 'PARTIAL';
  
  console.log('=== ALIBABA PROBLEMATIC LISTING RETRY ===');
  console.log(`🎯 Category: ${RETRY_CATEGORIES[category]?.label || category}`);
  console.log(`🌐 Environment: ${PRODUCTION_MODE ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🔗 API URL: ${API_URL}\n`);

  // Authenticate if in production
  await authenticateForProduction();

  const progress = loadProgress();
  progress.category = category;

  console.log(`📊 Starting from offset: ${progress.offset}`);
  console.log(`📈 Previous stats: ${progress.improved} improved, ${progress.unchanged} unchanged, ${progress.stillBad} still bad, ${progress.errors} errors\n`);

  const startTime = Date.now();
  let consecutiveErrors = 0;

  try {
    while (true) {
      const listings = await getProblematicAlibabaListings(category, progress.offset);
      
      if (listings.length === 0) {
        console.log('🏁 No more listings to process');
        break;
      }

      console.log(`📦 Processing batch: ${progress.offset + 1}-${progress.offset + listings.length}`);

      for (let i = 0; i < listings.length; i += BATCH_SIZE) {
        const chunk = listings.slice(i, i + BATCH_SIZE);
        
        console.log(`\n🔄 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(listings.length / BATCH_SIZE)} (${chunk.length} items)`);
        
        for (const listing of chunk) {
          const retryKey = listing.id;
          const currentRetries = progress.retryCount[retryKey] || 0;
          
          if (currentRetries >= MAX_RETRIES_PER_LISTING) {
            console.log(`  ⏭️  ${listing.title?.substring(0, 50)}... (max retries reached)`);
            progress.offset++;
            continue;
          }

          console.log(`  🔍 ${listing.title?.substring(0, 50)}... (attempt ${currentRetries + 1})`);
          
          const result = await rescrapeAlibabaListing(listing.id);
          
          if (result.rateLimited) {
            console.log('    ⏸️  Rate limited, backing off...');
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            continue;
          }
          
          progress.retryCount[retryKey] = currentRetries + 1;
          
          if (result.success) {
            const originalAttrs = listing.attributesCount || 0;
            const newAttrs = result.attributes || 0;
            
            if (newAttrs > originalAttrs) {
              progress.improved++;
              console.log(`    🎉 Improved: ${originalAttrs} → ${newAttrs} attributes`);
            } else if (newAttrs === originalAttrs) {
              progress.unchanged++;
            } else {
              progress.stillBad++;
            }
            consecutiveErrors = 0;
          } else {
            progress.errors++;
            consecutiveErrors++;
            
            if (consecutiveErrors >= 10) {
              console.log('\n⚠️  Too many consecutive errors, pausing...');
              await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute pause
              consecutiveErrors = 0;
            }
          }
          
          progress.offset++;
        }

        // Inter-chunk delay
        if (i + BATCH_SIZE < listings.length) {
          console.log(`⏳ Waiting ${INTER_CHUNK_DELAY}ms before next chunk...`);
          await new Promise(resolve => setTimeout(resolve, INTER_CHUNK_DELAY));
        }
        
        // Save progress after each chunk
        saveProgress(progress);
      }

      // Delay between batches
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('💾 Progress saved, you can resume later');
  } finally {
    saveProgress(progress);
    await prisma.$disconnect();
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Retry completed in ${elapsed} minutes`);
  console.log(`📊 Final stats:`);
  console.log(`  🎉 ${progress.improved} improved`);
  console.log(`  🔄 ${progress.unchanged} unchanged`);
  console.log(`  😞 ${progress.stillBad} still bad`);
  console.log(`  ❌ ${progress.errors} errors`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏸️  Received interrupt signal');
  console.log('💾 Saving progress...');
  process.exit(0);
});

retryAlibabaProblematic().catch(console.error);