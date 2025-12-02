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
  const badPatterns = [
    /tps-\d{2,3}-\d{2,3}[^0-9]/i,     // Small thumbnails (80x80, 50x50, etc)
    /tps-\d{3,4}-\d{2,3}[^0-9]/i,     // Banners (920x110, 3840x80, etc)
    /tps-\d{2,3}-\d{3,4}[^0-9]/i,     // Vertical banners
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(url)) {
      return false;
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
