import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=${error}`, appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=no_code`, appUrl));
  }

  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/callback/pinterest`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=missing_server_config`, appUrl));
  }

  try {
    // Exchange the code for an access token
    const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
    
    // Pinterest API v5 requires Basic Auth for the token endpoint
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
        console.error('Pinterest Token Error:', tokenData);
        return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=token_exchange_failed`, appUrl));
    }

    const { access_token, refresh_token } = tokenData;

    // Use URL hash fragment to pass token back to the client securely (not sent to server in subsequent requests)
    const redirectUrl = new URL(`/dashboard/settings`, appUrl);
    redirectUrl.searchParams.set('tab', 'integrations');
    redirectUrl.searchParams.set('oauth', 'success');
    
    let hash = `pinterest_token=${encodeURIComponent(access_token)}`;
    if (refresh_token) {
        hash += `&pinterest_refresh=${encodeURIComponent(refresh_token)}`;
    }
    redirectUrl.hash = hash;

    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('OAuth Callback handling failed:', err);
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=server_error`, appUrl));
  }
}
