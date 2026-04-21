import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const slotId = searchParams.get('slotId') || '1';

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const clientId = process.env.THREADS_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (!clientId) {
    return NextResponse.json({ error: 'Threads APP ID is not configured on the server.' }, { status: 500 });
  }

  // Create a secure state that includes the user's ID and the target slotId
  const state = Buffer.from(JSON.stringify({ userId, slotId })).toString('base64');
  
  // Required Scopes for reading user info and publishing Threads
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/threads`;
  const scopes = ['threads_basic', 'threads_content_publish'];
  
  const threadsAuthUrl = new URL('https://threads.net/oauth/authorize');
  threadsAuthUrl.searchParams.append('client_id', clientId);
  threadsAuthUrl.searchParams.append('redirect_uri', redirectUri);
  threadsAuthUrl.searchParams.append('scope', scopes.join(','));
  threadsAuthUrl.searchParams.append('response_type', 'code');
  threadsAuthUrl.searchParams.append('state', state);

  return NextResponse.redirect(threadsAuthUrl.toString());
}
