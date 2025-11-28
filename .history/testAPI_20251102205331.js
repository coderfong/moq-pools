const http = require('http');

const url = 'https://www.alibaba.com/product-detail/Men-Cotton-Co-Ord-Shirt-and_10000028881705.html';
const encodedUrl = encodeURIComponent(url);
const apiUrl = `http://localhost:3007/api/external/detail-html?src=${encodedUrl}`;

console.log('Fetching:', apiUrl);

http.get(apiUrl, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse length:', data.length);
    try {
      const json = JSON.parse(data);
      console.log('\nParsed JSON keys:', Object.keys(json));
      console.log('\nTitle:', json.title);
      console.log('\nFull response:');
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      console.error('Parse error:', error.message);
      console.log('Raw data:', data.substring(0, 500));
    }
  });
}).on('error', (error) => {
  console.error('HTTP error:', error.message);
});
