const crypto = require('crypto');

const BLOCKED_URLS = [
  'https://img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
  'https://img.alicdn.com/imgextra/i1/O1CN01qOsGmF2ALhXk0QWRf_!!6000000008187-2-tps-297-40.png',
];

function isBlockedUrl(url) {
  if (!url) return false;
  let normalized = url.startsWith('//') ? `https:${url}` : url;
  if (!normalized.startsWith('http')) normalized = `https://${normalized}`;
  return BLOCKED_URLS.includes(normalized);
}

function isValidProductImage(url) {
  if (!url) return false;
  if (isBlockedUrl(url)) return false;
  if (!url.includes('alicdn.com') && !url.includes('alibaba.com')) return false;
  
  const tpsMatch = url.match(/tps-(\d+)-(\d+)/i);
  if (tpsMatch) {
    const width = parseInt(tpsMatch[1]);
    const height = parseInt(tpsMatch[2]);
    const aspectRatio = width / height;
    
    if (width <= 100 && height <= 100) return false;
    if (aspectRatio > 3 && height < 300) return false;
    if (aspectRatio < 0.33 && width < 300) return false;
    if (width === 600 && height === 600) return false;
  }
  
  if (/_\d{2,3}x\d{2,3}\./i.test(url)) {
    const dimMatch = url.match(/_(\d+)x(\d+)\./i);
    if (dimMatch) {
      const width = parseInt(dimMatch[1]);
      const height = parseInt(dimMatch[2]);
      if (width <= 100 && height <= 100) return false;
    }
  }
  
  return true;
}

const newBannerTests = [
  { url: 'https://img.alicdn.com/imgextra/i1/O1CN01qOsGmF2ALhXk0QWRf_!!6000000008187-2-tps-297-40.png', expected: false, reason: 'NEW: 297x40 banner (blocked)' },
  { url: 'https://img.alicdn.com/imgextra/i1/test-2-tps-300-40.png', expected: false, reason: 'NEW: 300x40 banner (aspect >3, height <300)' },
  { url: 'https://img.alicdn.com/imgextra/i1/test-2-tps-400-50.png', expected: false, reason: 'NEW: 400x50 banner (aspect >3, height <300)' },
  { url: 'https://img.alicdn.com/imgextra/i1/test-2-tps-500-400.png', expected: true, reason: 'NEW: 500x400 product (aspect 1.25, OK)' },
];

console.log('Testing NEW banner filtering:\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

newBannerTests.forEach((test, i) => {
  const result = isValidProductImage(test.url);
  const match = result === test.expected;
  
  if (match) {
    passed++;
    console.log(`✅ PASS #${i + 1}: ${test.reason}`);
  } else {
    failed++;
    console.log(`❌ FAIL #${i + 1}: ${test.reason}`);
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
  }
});

console.log('='.repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${newBannerTests.length} tests\n`);
