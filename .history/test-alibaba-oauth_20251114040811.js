/**
 * Test script for Alibaba OAuth2 token exchange
 * 
 * Usage:
 * 1. Get an authorization code by visiting the authorize URL
 * 2. Run this script with the code:
 *    node test-alibaba-oauth.js "3_501706_XXXXXXXX"
 * 
 * This verifies the OAuth flow works correctly before testing through the web app.
 */

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
const redirectUri = process.env.ALIBABA_REDIRECT_URI;

if (!appKey || !appSecret || !redirectUri) {
  console.error('Missing required environment variables:');
  console.error('  ALIBABA_APP_KEY:', appKey ? '✓' : '✗');
  console.error('  ALIBABA_APP_SECRET:', appSecret ? '✓' : '✗');
  console.error('  ALIBABA_REDIRECT_URI:', redirectUri ? '✓' : '✗');
  process.exit(1);
}

// IMPORTANT: Use the Open Platform gateway (openapi.alibaba.com)
// This must match where your app was created in the Alibaba console
const TOKEN_URL = `https://openapi.alibaba.com/openapi/param2/1/system.oauth2/getToken/${appKey}`;

const body = new URLSearchParams({
  grant_type: 'authorization_code',
  client_id: appKey,
  client_secret: appSecret,
  code: code,
  redirect_uri: redirectUri,
  sp: 'icbu',
});

console.log('🔄 Testing Alibaba OAuth2 Token Exchange');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Token URL:', TOKEN_URL);
console.log('App Key:', appKey);
console.log('Redirect URI:', redirectUri);
console.log('Code:', code.substring(0, 15) + '...');
console.log('');
console.log('⚠️  IMPORTANT: Make sure your callback URL in Alibaba console matches:');
console.log('   ', redirectUri);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

fetch(TOKEN_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
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
    if (data.error_response) {
      console.error('❌ API Error Response:', JSON.stringify(data.error_response, null, 2));
      
      const errorMsg = data.error_response.msg || data.error_response.sub_msg || 'Unknown error';
      const errorCode = data.error_response.code || data.error_response.sub_code || 'Unknown code';
      
      console.error('');
      console.error('Error Code:', errorCode);
      console.error('Error Message:', errorMsg);
      
      if (errorMsg.includes('invalid') || errorCode.includes('invalid')) {
        console.error('');
        console.error('💡 Tip: Check that your credentials and code are correct.');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Token exchange successful!');
    console.log('');
    console.log('Access Token:', data.access_token ? data.access_token.substring(0, 20) + '...' : 'N/A');
    console.log('Refresh Token:', data.refresh_token ? data.refresh_token.substring(0, 20) + '...' : 'N/A');
    console.log('Expires In:', data.expires_in, 'seconds');
    console.log('Seller ID:', data.seller_id || data.resource_owner || 'N/A');
    console.log('Account:', data.account || 'N/A');
    console.log('Service Provider:', data.sp || 'N/A');
    console.log('');
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ OAuth flow is working correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Store these tokens in your database');
    console.log('2. Use the access_token for API calls to gw.api.alibaba.com');
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
