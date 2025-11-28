/**
 * Alibaba OAuth2 Callback Handler
 * 
 * This endpoint receives the authorization code from Alibaba after a seller
 * authorizes your app. It exchanges the code for an access token.
 * 
 * Flow:
 * 1. Seller clicks "Authorize" on Alibaba
 * 2. Alibaba redirects to this URL with ?code=xxx
 * 3. We exchange code for access_token
 * 4. Store token in database/env
 * 5. Redirect seller to success page
 */

import { NextRequest, NextResponse } from 'next/server';
import { alibabaApi } from '@/lib/providers/alibabaApi';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle authorization errors
  if (error) {
    console.error('[Alibaba OAuth] Authorization error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/admin/alibaba-setup?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL('/admin/alibaba-setup?error=no_code', request.url)
    );
  }

  try {
    console.log('[Alibaba OAuth] Received authorization code:', code.substring(0, 20) + '...');

    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code);

    if (!tokenData?.access_token) {
      throw new Error('Failed to obtain access token');
    }

    console.log('[Alibaba OAuth] ✓ Access token obtained');
    console.log(`  Token: ${tokenData.access_token.substring(0, 20)}...`);
    console.log(`  Expires in: ${tokenData.expires_in} seconds`);

    // TODO: Store token in database
    // await prisma.alibabaCredentials.upsert({
    //   where: { id: 1 },
    //   update: {
    //     accessToken: tokenData.access_token,
    //     refreshToken: tokenData.refresh_token,
    //     expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    //   },
    //   create: {
    //     accessToken: tokenData.access_token,
    //     refreshToken: tokenData.refresh_token,
    //     expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    //   },
    // });

    // For now, log instructions to add to .env
    console.log('\n─────────────────────────────────────────────');
    console.log('✅ Authorization Successful!');
    console.log('─────────────────────────────────────────────');
    console.log('Add these to your .env file:\n');
    console.log(`ALIBABA_ACCESS_TOKEN=${tokenData.access_token}`);
    if (tokenData.refresh_token) {
      console.log(`ALIBABA_REFRESH_TOKEN=${tokenData.refresh_token}`);
    }
    console.log('\nToken expires in:', Math.round(tokenData.expires_in / 3600), 'hours');
    console.log('─────────────────────────────────────────────\n');

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/admin/alibaba-setup?success=true&token=${encodeURIComponent(tokenData.access_token.substring(0, 20) + '...')}`,
        request.url
      )
    );
  } catch (error) {
    console.error('[Alibaba OAuth] Token exchange failed:', error);
    return NextResponse.redirect(
      new URL(
        `/admin/alibaba-setup?error=${encodeURIComponent(error instanceof Error ? error.message : 'token_exchange_failed')}`,
        request.url
      )
    );
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string) {
  const appKey = process.env.ALIBABA_APP_KEY;
  const appSecret = process.env.ALIBABA_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('ALIBABA_APP_KEY and ALIBABA_APP_SECRET must be set');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: appKey,
    client_secret: appSecret,
    code: code,
    redirect_uri: process.env.ALIBABA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/alibaba/callback`,
  });

  const response = await fetch('https://gw.open.1688.com/openapi/auth/token/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  
  if (data.error_response) {
    throw new Error(data.error_response.msg || JSON.stringify(data.error_response));
  }

  return data;
}
