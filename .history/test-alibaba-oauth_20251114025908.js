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

const ALIBABA_AUTH_BASE = 'https://openapi-auth.alibaba.com';
const TOKEN_URL = `${ALIBABA_AUTH_BASE}/oauth/token`;

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

const body = new URLSearchParams({
  grant_type: 'authorization_code',
  code: code,
  client_id: appKey,
  client_secret: appSecret,
  redirect_uri: redirectUri,
  sp: 'icbu',
});

console.log('🔄 Testing Alibaba OAuth2 Token Exchange');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Token URL:', TOKEN_URL);
console.log('App Key:', appKey);
console.log('Redirect URI:', redirectUri);
console.log('Code:', code.substring(0, 15) + '...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

fetch(TOKEN_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: body.toString(),
})
  .then(async (response) => {
    // Read as text first to handle both JSON and form-urlencoded responses
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    
    console.log('\n📥 Response Status:', response.status, response.statusText);
    console.log('📄 Content-Type:', contentType);
    console.log('📝 Raw Response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Parse response based on content type
    let data;
    try {
      if (contentType.includes('application/json')) {
        data = JSON.parse(text);
      } else {
        // Parse as URLSearchParams (form-urlencoded)
        const params = new URLSearchParams(text);
        data = {};
        for (const [k, v] of params.entries()) {
          data[k] = v;
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError.message);
      console.error('Raw response:', text);
      process.exit(1);
    }
    
    if (!response.ok || (data.error && data.error !== '0')) {
      console.error('❌ Token exchange failed!');
      console.error('');
      console.error('Parsed response:');
      console.error(JSON.stringify(data, null, 2));
      
      if (data.error === 'invalid_grant' || data.error_code === 'invalid_grant') {
        console.error('');
        console.error('💡 Tip: Authorization codes expire quickly and can only be used once.');
        console.error('   Get a fresh code by visiting the authorize URL again.');
      }
      
      if (data.error === 'invalid_client' || data.error_code === 'invalid_client') {
        console.error('');
        console.error('💡 Tip: Check that your ALIBABA_APP_KEY and ALIBABA_APP_SECRET are correct.');
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
