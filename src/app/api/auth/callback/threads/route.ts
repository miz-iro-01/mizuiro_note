import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=${error}`, appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=no_code`, appUrl));
  }

  const clientId = process.env.THREADS_CLIENT_ID;
  const clientSecret = process.env.THREADS_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/callback/threads`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=missing_server_config`, appUrl));
  }

  try {
    // 1. Exchange the code for a short-lived access token
    const tokenUrl = 'https://graph.threads.net/oauth/access_token';
    const formParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formParams,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
        console.error('Threads Token Error:', tokenData);
        return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=token_exchange_failed`, appUrl));
    }

    const { access_token: shortLivedToken, user_id } = tokenData;

    // 2. We MUST exchange the short-lived token (1 hour) for a long-lived token (60 days) to be useful for automation
    const longLivedUrl = new URL('https://graph.threads.net/access_token');
    longLivedUrl.searchParams.append('grant_type', 'th_exchange_token');
    longLivedUrl.searchParams.append('client_secret', clientSecret);
    longLivedUrl.searchParams.append('access_token', shortLivedToken);

    const exchangeResponse = await fetch(longLivedUrl.toString(), { method: 'GET' });
    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
        console.error('Threads Long-Lived Token Exchange Error:', exchangeData);
        return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=long_lived_exchange_failed`, appUrl));
    }

    const finalToken = exchangeData.access_token || shortLivedToken;

    // 3. Return to the app with standard Hash parsing
    // URL Hash fragment allows client JS to see it without exposing in server access logs
    const redirectUrl = new URL(`/dashboard/settings`, appUrl);
    redirectUrl.searchParams.set('tab', 'integrations');
    redirectUrl.searchParams.set('oauth', 'success');
    
    // stateからslotIdを復元
    const stateParam = searchParams.get('state');
    let targetSlot = '1';
    if (stateParam) {
      try {
        const decodedState = JSON.parse(Buffer.from(stateParam, 'base64').toString());
        targetSlot = decodedState.slotId || '1';
      } catch (e) {
        console.warn('Failed to decode state in callback', e);
      }
    }

    // Pass token, user_id, and slot_id
    redirectUrl.hash = `threads_token=${encodeURIComponent(finalToken)}&threads_user_id=${encodeURIComponent(user_id)}&threads_slot_id=${targetSlot}`;

    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('Threads OAuth Callback handling failed:', err);
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=integrations&oauth_error=server_error`, appUrl));
  }
}
