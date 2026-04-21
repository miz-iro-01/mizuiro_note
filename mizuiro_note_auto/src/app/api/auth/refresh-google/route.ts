import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'リフレッシュトークンが提供されていません。' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'サーバーに GOOGLE_CLIENT_ID または GOOGLE_CLIENT_SECRET が設定されていないため、自動リフレッシュを実行できません。' },
        { status: 500 }
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Google token refresh error:', data);
      return NextResponse.json(
        { error: data.error_description || data.error || 'トークンのリフレッシュに失敗しました。再度OAuth連携が必要な可能性があります。' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (error: any) {
    console.error('refresh-google API Error:', error);
    return NextResponse.json({ error: 'サーバー内部エラーが発生しました。' }, { status: 500 });
  }
}
