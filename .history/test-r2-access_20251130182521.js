const https = require('https');

const testUrls = [
  'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev/cache/66143208a81c6447225c8b59e76f297a8ef959a1.jpg',
  'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev/cache/3ac4bec75cfc9c1e5d352b68f0cb5f125bac9ec3.jpg',
  'https://pub-82e54d312a9f4018bc4ac4ea93c2d02d.r2.dev/cache/8ade7fb49fc4d68ee6cedcac8fd1d8a53a4c83af.jpg',
];

console.log('\n🧪 Testing R2 Image Accessibility:\n');

testUrls.forEach((url, i) => {
  https.get(url, { method: 'HEAD' }, (res) => {
    const status = res.statusCode === 200 ? '✅' : '❌';
    console.log(`${status} Image ${i+1}: ${res.statusCode} - ${url.split('/').pop()}`);
    if (res.statusCode === 200) {
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      console.log(`   Size: ${(parseInt(res.headers['content-length']) / 1024).toFixed(1)} KB`);
    }
  }).on('error', (err) => {
    console.log(`❌ Image ${i+1}: Error - ${err.message}`);
  });
});
