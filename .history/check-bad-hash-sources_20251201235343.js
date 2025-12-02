const crypto = require('crypto');

// The bad hashes we're trying to identify
const badHashes = [
  '4e70cc58277297de2d4741c437c9dc425c4f8adb',
  'e7cc244e1d0f558ae9669f57b973758bc14103ee'
];

// Known bad URLs from the output
const knownBadUrls = [
  'https://img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  'https://s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
  // Try with // prefix
  '//img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  '//s.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
  // Try without https:
  'img.alicdn.com/imgextra/i1/O1CN01YyMrnH1TH65JNfJZU_!!6000000002356-2-tps-600-600.png',
  's.alicdn.com/@img/imgextra/i1/O1CN01e5zQ2S1cAWz26ivMo_!!6000000003560-2-tps-920-110.png',
];

console.log('Testing URLs to find which hash to bad images:\n');

knownBadUrls.forEach(url => {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const match = badHashes.includes(hash);
  console.log(`${match ? '✅ MATCH' : '  '} ${url}`);
  console.log(`   -> ${hash}.png`);
  if (match) {
    console.log(`   *** This URL produces bad hash ${hash} ***`);
  }
  console.log('');
});

console.log('\nChecking what dimensions these images are:');
console.log('  4e70cc582772... = 600x600 (tps-600-600)');
console.log('  e7cc244e1d0f... = 920x110 (tps-920-110) - banner/placeholder');
