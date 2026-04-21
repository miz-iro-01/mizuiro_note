import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const clientIdFromQuery = searchParams.get('clientId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const clientId = clientIdFromQuery || process.env.PINTEREST_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (!clientId) {
    return NextResponse.json({ error: 'Pinterest Client ID is not configured on the server. Please enter it in Settings.' }, { status: 500 });
  }

  const redirectUri = `${appUrl}/api/auth/callback/pinterest`;
  
  // Create a secure state that includes the user's ID so we know who to update upon return
  // In production, you should encrypt this or add a CSRF token
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  
  // Required Scopes for creating Boards and Pins
  const scopes = ['boards:read', 'boards:write', 'pins:read', 'pins:write'];
  
  const pinterestAuthUrl = new URL('https://www.pinterest.com/oauth/');
  pinterestAuthUrl.searchParams.append('client_id', clientId);
  pinterestAuthUrl.searchParams.append('redirect_uri', redirectUri);
  pinterestAuthUrl.searchParams.append('response_type', 'code');
  pinterestAuthUrl.searchParams.append('scope', scopes.join(','));
  pinterestAuthUrl.searchParams.append('state', state);

  return NextResponse.redirect(pinterestAuthUrl.toString());
}
