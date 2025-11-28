import { NextRequest, NextResponse } from 'next/server';
import { alibabaApi } from '@/lib/providers/alibabaApi';

/**
 * Alibaba OAuth2 Authorization Initiator
 * 
 * This endpoint redirects users to Alibaba's authorization page
 * where they can authorize your app to access their account.
 * 
 * Usage:
 * - Create a button in your admin panel: <a href="/api/alibaba/authorize">Connect Alibaba Account</a>
 * - User clicks the button
 * - Gets redirected to Alibaba login/authorization page
 * - After approval, Alibaba redirects back to /api/alibaba/callback
 */

export async function GET(request: NextRequest) {
  try {
    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);

    // TODO: Store state in session or database to verify in callback
    // For now, we'll pass it through the OAuth flow
    
    // Generate authorization URL
    const authUrl = alibabaApi.generateAuthorizationUrl(state);

    console.log('[Alibaba OAuth] Redirecting to authorization URL');
    console.log(`  State: ${state}`);

    // Redirect user to Alibaba authorization page
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('[Alibaba OAuth] Authorization initiation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
