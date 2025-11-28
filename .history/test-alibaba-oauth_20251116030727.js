/**
 * Test script for Alibaba IOP OAuth token exchange
 * 
 * Usage:
 * 1. Get an authorization code by visiting the authorize URL
 * 2. Run this script with the code:
 *    node test-alibaba-oauth.js "3_501706_XXXXXXXX"
 * 
 * This verifies the IOP token exchange works correctly before testing through the web app.
 */

const crypto = require('crypto');

const code = process.argv[2];

if (!code) {
  console.error('Usage: node test-alibaba-oauth.js <authorization_code>');
  console.error('');
  console.error('Example:');
  console.error('  node test-alibaba-oauth.js "3_501706_XXXXXXXX"');
  process.exit(1);
}

const appKey = process.env.ALIBABA_APP_KEY;
const appSecret = process.env.ALIBABA_APP_SECRET;

if (!appKey || !appSecret) {
  console.error('Missing required environment variables:');
  console.error('  ALIBABA_APP_KEY:', appKey ? '✓' : '✗');
  console.error('  ALIBABA_APP_SECRET:', appSecret ? '✓' : '✗');
  process.exit(1);
}

// IMPORTANT: Use the IOP REST gateway for token creation
const API_HOST = 'https://openapi.alibaba.com';
const API_PATH = '/rest/auth/token/create';
const TOKEN_URL = `${API_HOST}${API_PATH}`;

// Build parameters for signed request
const timestamp = Date.now().toString(); // milliseconds since epoch
const params = {
  app_key: appKey,
  code: code,
  timestamp: timestamp,
  sign_method: 'sha256',
};

// Generate signature according to Alibaba's IOP signing rules
// Algorithm: HMAC-SHA256(API_PATH + sorted_params, APP_SECRET)
const sortedKeys = Object.keys(params).sort();
const paramString = sortedKeys.map(key => `${key}${params[key]}`).join('');
const signString = `${API_PATH}${paramString}`;

const sign = crypto
  .createHmac('sha256', appSecret)
  .update(signString, 'utf8')
  .digest('hex')
  .toUpperCase();

// Build form body with all params including sign
const body = new URLSearchParams({
  ...params,
  sign,
});

console.log('🔄 Testing Alibaba IOP Token Exchange');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Token URL:', TOKEN_URL);
console.log('App Key:', appKey);
console.log('Code:', code.substring(0, 15) + '...');
console.log('Timestamp:', timestamp);
console.log('Sign String:', signString.substring(0, 50) + '...');
console.log('Sign (first 10 chars):', sign.substring(0, 10) + '...');
console.log('');
console.log('⚠️  Using IOP signed POST request (HMAC-SHA256)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

fetch(TOKEN_URL, {
  method: 'POST', // IOP REST APIs use POST
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  },
  body: body.toString(),
})
  .then(async (response) => {
    // Read as text first for better error handling
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    
    console.log('\n📥 Response Status:', response.status, response.statusText);
    console.log('📄 Content-Type:', contentType);
    console.log('📝 Raw Response:', text.substring(0, 300) + (text.length > 300 ? '...' : ''));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!response.ok) {
      console.error('❌ Token request failed!');
      console.error('Raw response:', text);
      process.exit(1);
    }
    
    // Parse JSON response
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError.message);
      console.error('Raw response:', text);
      process.exit(1);
    }
    
    // Check for API error
    if (data.error_code || data.error_response) {
      console.error('❌ API Error Response:', JSON.stringify(data, null, 2));
      
      const errorMsg = data.error_message || data.error_response?.msg || 'Unknown error';
      const errorCode = data.error_code || data.error_response?.code || 'Unknown code';
      
      console.error('');
      console.error('Error Code:', errorCode);
      console.error('Error Message:', errorMsg);
      
      if (errorCode.includes('sign') || errorCode.includes('signature')) {
        console.error('');
        console.error('💡 Tip: Signature generation issue.');
        console.error('   The signature algorithm is: HMAC-SHA256(API_PATH + sorted_params, app_secret)');
        console.error('   Make sure to include the API path in the sign string!');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Token exchange successful!');
    console.log('');
    console.log('Access Token:', data.access_token ? data.access_token.substring(0, 20) + '...' : 'N/A');
    console.log('Refresh Token:', data.refresh_token ? data.refresh_token.substring(0, 20) + '...' : 'N/A');
    console.log('Expires In:', data.expires_in, 'seconds');
    console.log('User ID:', data.user_id || 'N/A');
    console.log('Seller ID:', data.seller_id || 'N/A');
    console.log('Account:', data.account || 'N/A');
    console.log('');
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Alibaba IOP token exchange is working correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Store these tokens in your database');
    console.log('2. Use the access_token for API calls to openapi.alibaba.com');
    console.log('3. Use the refresh_token to get new access tokens when needed');
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Request failed:', error.message);
    console.error('');
    console.error('Full error:');
    console.error(error);
    process.exit(1);
  });
