import { NextRequest, NextResponse } from 'next/server';

/**
 * Google OAuth 認可コードフロー - 開始
 * 
 * signInWithPopupではリフレッシュトークンが取得できないため、
 * サーバーサイドの認可コードフローを使って確実にリフレッシュトークンを取得します。
 * 
 * アクセス: /api/auth/google?userId=xxx
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const slotId = request.nextUrl.searchParams.get('slotId') || '1';
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_IDが.envに設定されていません。' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/google`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/blogger',
    access_type: 'offline',
    prompt: 'consent', // 毎回consentを要求してリフレッシュトークンを確実に取得
    state: JSON.stringify({ userId, slotId }),
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  
  return NextResponse.redirect(authUrl);
}
