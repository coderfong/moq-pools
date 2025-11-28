import { NextRequest, NextResponse } from 'next/server';
import { alibabaApi } from '@/lib/providers/alibabaApi';

/**
 * Alibaba OAuth2 Callback Handler
 * 
 * This endpoint receives the authorization code from Alibaba after a seller
 * authorizes your app, then exchanges it for an access token.
 * 
 * Callback URL to register in Alibaba Developer Portal:
 * - Development: http://localhost:3007/api/alibaba/callback
 * - Production: https://your-domain.com/api/alibaba/callback
 * 
 * Flow:
 * 1. User clicks "Authorize" on Alibaba
 * 2. Alibaba redirects to this endpoint with ?code=xxx
 * 3. We exchange the code for access token
 * 4. Store token and redirect user back to app
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for errors from Alibaba
    if (error) {
      console.error('[Alibaba OAuth] Authorization failed:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin/settings?error=alibaba_auth_failed&message=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    // Validate authorization code
    if (!code) {
      console.error('[Alibaba OAuth] No authorization code received');
      return NextResponse.redirect(
        new URL('/admin/settings?error=no_code', request.url)
      );
    }

    console.log('[Alibaba OAuth] Received authorization code:', code.substring(0, 10) + '...');

    // Exchange authorization code for access token
    const tokenData = await alibabaApi.exchangeCodeForToken(code);

    if (!tokenData?.access_token) {
      console.error('[Alibaba OAuth] Failed to exchange code for token');
      return NextResponse.redirect(
        new URL('/admin/settings?error=token_exchange_failed', request.url)
      );
    }

    console.log('[Alibaba OAuth] ✓ Successfully obtained access token');
    console.log(`  Token expires in: ${tokenData.expires_in} seconds`);

    // TODO: Store token in your database
    // Example:
    // await prisma.settings.upsert({
    //   where: { key: 'alibaba_access_token' },
    //   create: { key: 'alibaba_access_token', value: tokenData.access_token },
    //   update: { value: tokenData.access_token },
    // });
    
    // await prisma.settings.upsert({
    //   where: { key: 'alibaba_refresh_token' },
    //   create: { key: 'alibaba_refresh_token', value: tokenData.refresh_token },
    //   update: { value: tokenData.refresh_token },
    // });

    // For now, log success and redirect
    const successUrl = new URL('/admin/settings', request.url);
    successUrl.searchParams.set('alibaba_auth', 'success');
    successUrl.searchParams.set('expires_in', tokenData.expires_in.toString());

    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('[Alibaba OAuth] Callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin/settings?error=callback_error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    );
  }
}
