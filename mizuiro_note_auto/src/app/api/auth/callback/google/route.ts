import { NextRequest, NextResponse } from 'next/server';

/**
 * Google OAuth コールバック
 * 
 * 認可コードをアクセストークン＋リフレッシュトークンに交換し、
 * 設定画面にリダイレクトしてハッシュフラグメント経由でクライアントに渡します。
 * クライアント側（integrations-form.tsx）でFirestoreに保存します。
 */

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateStr = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      const redirectUrl = new URL('/dashboard/settings?tab=integrations', request.url);
      redirectUrl.searchParams.set('oauth_error', error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !stateStr) {
      return NextResponse.json(
        { error: '認可コードまたはstateパラメータが不足しています。' },
        { status: 400 }
      );
    }

    let state: { userId?: string; slotId?: string };
    try {
      state = JSON.parse(stateStr);
    } catch {
      return NextResponse.json({ error: 'stateパラメータが無効です。' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: '.envにGOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRETが設定されていません。' },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/google`;

    // 認可コードをトークンに交換
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google OAuth token exchange failed:', tokenData);
      const redirectUrl = new URL('/dashboard/settings?tab=integrations', request.url);
      redirectUrl.searchParams.set('oauth_error', tokenData.error_description || '認可コードの交換に失敗しました');
      return NextResponse.redirect(redirectUrl);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    console.log('=== Google OAuth トークン取得成功 ===');
    console.log('アクセストークン:', access_token ? '✓ 取得済み' : '✗ 未取得');
    console.log('リフレッシュトークン:', refresh_token ? '✓ 取得済み' : '✗ 未取得');
    console.log('有効期限:', expires_in, '秒');

    // 設定画面にリダイレクト（トークン情報をハッシュフラグメントで渡す）
    // クライアント側（integrations-form.tsx）でFirestoreに保存される
    let hash = `blogger_token=${encodeURIComponent(access_token)}`;
    if (refresh_token) {
      hash += `&blogger_refresh=${encodeURIComponent(refresh_token)}`;
    }
    if (state.slotId) {
      hash += `&blogger_slot_id=${encodeURIComponent(state.slotId)}`;
    }

    // settings?tab=integrationsにリダイレクト
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/dashboard/settings?tab=integrations#${hash}`;
    
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    const redirectUrl = new URL('/dashboard/settings?tab=integrations', request.url);
    redirectUrl.searchParams.set('oauth_error', error.message || '不明なエラーが発生しました');
    return NextResponse.redirect(redirectUrl);
  }
}
