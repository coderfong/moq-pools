// Test thumbnail to full-size URL conversion

const testUrls = [
  '//s.alicdn.com/@sc04/kf/Hd6be7df19fc945a49ac2f1539bea55d7K.jpg_80x80.jpg',
  '//s.alicdn.com/@sc04/kf/H88314ec26e4248b6b41c81b652162a6e6.jpg_80x80.jpg',
  'https://s.alicdn.com/@sc04/kf/Ha4edf7553081420ebb6eab95a47d4943f.png_80x80.jpg',
  'https://img.alicdn.com/imgextra/i1/test_50x50.png',
];

console.log('Testing thumbnail URL conversion:\n');

testUrls.forEach(url => {
  let normalized = url.startsWith('//') ? `https:${url}` : url.startsWith('http') ? url : `https://${url}`;
  
  // Remove thumbnail suffix
  const fullSize = normalized.replace(/_\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i, '.$1');
  
  console.log(`Original:  ${url}`);
  console.log(`Full-size: ${fullSize}`);
  console.log('');
});
