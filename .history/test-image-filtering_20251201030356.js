// Test the image filtering logic

const BLOCKED_URLS = [
  'https://img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
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
  
  // Filter out small thumbnails and banners by dimension patterns
  // Match format: tps-WIDTHxHEIGHT (e.g., tps-600-600, tps-920-110)
  const tpsMatch = url.match(/tps-(\d+)-(\d+)/i);
  if (tpsMatch) {
    const width = parseInt(tpsMatch[1]);
    const height = parseInt(tpsMatch[2]);
    
    // Block if BOTH dimensions are small (thumbnails like 80x80, 50x50)
    if (width <= 100 && height <= 100) return false;
    
    // Block if it's a wide banner (wide but short, like 920x110, 3840x80)
    if (width >= 900 && height <= 200) return false;
    
    // Block if it's a tall banner (short but tall, like 80x3840)
    if (width <= 200 && height >= 900) return false;
    
    // Block specific known bad dimensions
    if (width === 600 && height === 600) return false; // The bad placeholder
  }
  
  // Also check for _80x80, _50x50 style thumbnails
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

// Test cases
const testUrls = [
  // BAD - blocked explicitly
  { url: 'https://img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png', expected: false, reason: 'Blocked 600x600 placeholder' },
  { url: 'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png', expected: false, reason: 'Blocked banner' },
  
  // BAD - small thumbnails
  { url: 'https://sc04.alicdn.com/kf/Ha4edf7553081420ebb6eab95a47d4943f.png_80x80.jpg', expected: false, reason: 'Small thumbnail 80x80' },
  { url: 'https://img.alicdn.com/imgextra/i2/O1CN01uNjRut1CqUxAHU9yu_!!6000000000132-2-tps-50-50.png', expected: false, reason: 'Small thumbnail 50x50' },
  
  // BAD - banners
  { url: 'https://img.alicdn.com/imgextra/i1/O1CN01CNSCB71Pf8YFpzTsN_!!6000000001867-2-tps-3840-80.png', expected: false, reason: 'Wide banner 3840x80' },
  { url: 'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png', expected: false, reason: 'Banner 920x110' },
  
  // GOOD - product images (larger dimensions)
  { url: 'https://img.alicdn.com/imgextra/i1/O1CN01test_!!6000000002356-2-tps-800-800.png', expected: true, reason: 'Product image 800x800' },
  { url: 'https://img.alicdn.com/imgextra/i1/O1CN01test_!!6000000002356-2-tps-1000-1000.jpg', expected: true, reason: 'Product image 1000x1000' },
  { url: 'https://img.alicdn.com/imgextra/i1/O1CN01test_!!6000000002356-2-tps-1200-900.jpg', expected: true, reason: 'Product image 1200x900' },
  { url: 'https://sc04.alicdn.com/kf/Htest.jpg_640x640.jpg', expected: true, reason: 'Product image 640x640' },
];

console.log('Testing image filtering logic:\n');
console.log('=' .repeat(80));

let passed = 0;
let failed = 0;

testUrls.forEach((test, i) => {
  const result = isValidProductImage(test.url);
  const match = result === test.expected;
  
  if (match) {
    passed++;
    console.log(`✅ PASS #${i + 1}: ${test.reason}`);
  } else {
    failed++;
    console.log(`❌ FAIL #${i + 1}: ${test.reason}`);
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
    console.log(`   URL: ${test.url}`);
  }
});

console.log('=' .repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testUrls.length} tests`);

if (failed === 0) {
  console.log('\n✅ All tests passed! The filtering logic is working correctly.\n');
} else {
  console.log('\n❌ Some tests failed. Review the logic before proceeding.\n');
}
