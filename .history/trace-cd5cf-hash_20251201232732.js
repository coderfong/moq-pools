const crypto = require('crypto');
const https = require('https');

const targetHash = 'cd5cf41e57f830841012f9673a557f4174a58a78';

// Common Alibaba banner/placeholder patterns to test
const testUrls = [
  // Known bad from before
  'https://img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
  
  // Try variations and common patterns
  'https://img.alicdn.com/imgextra/i2/O1CN01uNjRut1CqUxAHU9yu_!!6000000000132-2-tps-960-102.png',
  'https://img.alicdn.com/imgextra/i1/O1CN01CNSCB71Pf8YFpzTsN_!!6000000001867-2-tps-3840-80.png',
  'https://sc04.alicdn.com/kf/Ha4edf7553081420ebb6eab95a47d4943f.png',
  
  // Try checking if it's from the second gallery image (index 1)
  '//img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
];

console.log(`Looking for URL that hashes to: ${targetHash}\n`);

testUrls.forEach(url => {
  let normalized = url.startsWith('//') ? `https:${url}` : url;
  if (!normalized.startsWith('http')) normalized = `https://${normalized}`;
  
  const hash = crypto.createHash('sha1').update(normalized).digest('hex');
  const match = hash === targetHash;
  
  console.log(`${match ? '✅ MATCH!' : '  '} ${url}`);
  console.log(`   Hash: ${hash}`);
  if (match) {
    console.log(`   *** THIS IS THE URL! ***`);
  }
  console.log('');
});

console.log('\nLet me also try to fetch the actual image to see what it is...');
console.log('Downloading: https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev/cache/cd5cf41e57f830841012f9673a557f4174a58a78.png\n');

https.get('https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev/cache/cd5cf41e57f830841012f9673a557f4174a58a78.png', (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Content-Type: ${res.headers['content-type']}`);
  console.log(`Content-Length: ${res.headers['content-length']} bytes`);
  
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    console.log(`Actual size: ${buffer.length} bytes`);
    
    // Try to detect image type
    const header = buffer.slice(0, 8).toString('hex');
    console.log(`File header: ${header}`);
    
    if (header.startsWith('89504e47')) {
      console.log('Format: PNG');
    } else if (header.startsWith('ffd8ff')) {
      console.log('Format: JPEG');
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
