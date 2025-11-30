// Test image quality upgrade function

function upgradeImageQuality(url) {
  if (!url) return url;
  try {
    // For Alibaba CDN images, upgrade to high quality
    if (url.includes('alicdn.com') || url.includes('alibaba.com')) {
      // Replace small sizes with large ones: _80x80, _50x50, _220x220 -> _960x960
      url = url.replace(/_(50|80|100|220|300|350)x\1\.(jpg|jpeg|png|webp)/gi, '_960x960.$2');
      // If no size suffix, add _960x960 before extension for supported images
      if (!/_\d+x\d+\.(jpg|jpeg|png|webp)/i.test(url)) {
        url = url.replace(/\.(jpg|jpeg|png|webp)(\?|$)/i, '_960x960.$1$2');
      }
    }
    return url;
  } catch {
    return url;
  }
}

// Test cases
const testUrls = [
  'https://s.alicdn.com/@sc04/kf/H0b4d4940b5ee4a2e8eafde212897d9e37.jpg_80x80.jpg',
  'https://sc04.alicdn.com/kf/Hdbbb6a106e8d4515be692063768d8fd4J.png',
  'https://s.alicdn.com/kf/H123456.jpg_50x50.jpg',
  'https://sc04.alicdn.com/kf/H123.jpg_220x220.jpg',
  '/cache/66143208a81c6447225c8b59e76f297a8ef959a1.jpg',
  'https://example.com/image.jpg'
];

console.log('Testing image quality upgrade:\n');
testUrls.forEach(url => {
  const upgraded = upgradeImageQuality(url);
  console.log('Original:', url);
  console.log('Upgraded:', upgraded);
  console.log('Changed:', url !== upgraded ? 'YES ✓' : 'NO');
  console.log('---');
});
