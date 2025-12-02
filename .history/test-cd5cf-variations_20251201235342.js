const crypto = require('crypto');

// The URL we found (partial)
const testUrls = [
  'https://img.alicdn.com/imgextra/i1/O1CN01qOsGmF2ALhXk0QWRf_!!6000000008187-2-tps-750-120.png',
  'https://img.alicdn.com/imgextra/i1/O1CN01qOsGmF2ALhXk0QWRf_!!6000000008187-2-tps-600-600.png',
  'https://img.alicdn.com/imgextra/i1/O1CN01qOsGmF2ALhXk0QWRf_!!6000000008187-2-tps-800-800.png',
];

const targetHash = 'cd5cf41e57f830841012f9673a557f4174a58a78';

console.log('Testing variations:\n');

testUrls.forEach(url => {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const match = hash === targetHash;
  console.log(`${match ? '✅ MATCH!' : '  '} ${url}`);
  console.log(`   ${hash}`);
  if (match) console.log('   *** THIS IS IT! ***');
  console.log('');
});
