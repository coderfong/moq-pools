/**
 * Check if we can reverse-engineer original URLs from cache files
 * The cache filenames are SHA1 hashes of the original URLs
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function main() {
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  
  try {
    const files = await fs.readdir(cacheDir);
    const jpgFiles = files.filter(f => f.endsWith('.jpg')).slice(0, 10);
    
    console.log(`\nFound ${files.length} cache files, checking first 10 JPGs:\n`);
    
    for (const file of jpgFiles) {
      const hash = file.replace('.jpg', '');
      console.log(`File: ${file}`);
      console.log(`Hash: ${hash}`);
      
      // Try common Alibaba CDN patterns
      const commonPatterns = [
        `https://s.alicdn.com/@sc04/kf/${hash}.jpg`,
        `https://sc04.alicdn.com/kf/${hash}.jpg`,
        `https://s.alicdn.com/@sc01/kf/${hash}.jpg`,
      ];
      
      for (const url of commonPatterns) {
        const testHash = crypto.createHash('sha1').update(url).digest('hex');
        if (testHash === hash) {
          console.log(`✅ MATCH! Original URL: ${url}`);
          break;
        }
      }
      console.log('');
    }
    
    console.log('\n💡 The cache files are named with SHA1 hash of the original URL');
    console.log('💡 Without the original URL, we cannot reverse the hash');
    console.log('💡 You need to re-scrape from source pages to get new image URLs\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n💡 Cache directory might not exist or be empty');
    console.log('💡 You need to re-scrape from Alibaba source pages\n');
  }
}

main();
