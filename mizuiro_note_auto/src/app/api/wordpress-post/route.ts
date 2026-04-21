import { NextRequest, NextResponse } from 'next/server';

/**
 * WordPress Server-side Poster (via API Proxy)
 * ブラウザからのCORS制限を回避し、かつ認証エラーを詳細に特定します。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteUrl, username, appPassword, title, content } = body;

    if (!siteUrl || !username || !appPassword || !title || !content) {
      return NextResponse.json(
        { error: 'WordPressの設定または投稿内容が不足しています。' },
        { status: 400 }
      );
    }

    // URLの整形: 末尾のスラッシュを削除し、必要に応じてプロトコル付与
    let cleanUrl = siteUrl.replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const apiUrl = `${cleanUrl}/wp-json/wp/v2/posts`;
    
    // 認証ヘッダー (Basic Auth: username:appPassword)
    const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MIZUIRO-Studio/1.0',
      },
      body: JSON.stringify({
        title,
        content,
        status: 'publish', // 即座に公開
      }),
    });

    if (!response.ok) {
      let errorData: any = {};
      const errorText = await response.text();
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText.substring(0, 100) };
      }
      console.error('WordPress API Error:', errorData);

      let message = `WordPressエラー: ${errorData.message || '投稿に失敗しました。'}`;
      if (response.status === 401) {
        message = '認証エラー：ユーザー名またはアプリケーションパスワードが正しくありません。';
      } else if (response.status === 403) {
        message = `権限エラー：(1) SiteGuard等のセキュリティプラグインやWAFがAPI通信をブロックしている、(2) このユーザーに投稿権限がない 可能性があります。 (${errorData.code || 'Forbidden'})`;
      } else if (response.status === 404) {
        message = '接続エラー：URLが間違っているか、REST APIが無効です。「パーマリンク設定」が「基本」になっている場合は「投稿名」などに変更してください。';
      } else if (errorText.trim().startsWith('<')) {
        message = '通信エラー：WordPressのREST APIから正しいデータ（JSON）が返されませんでした。\n「パーマリンク設定」が「基本」の場合は変更してください。\nそれでも直らない場合はセキュリティプラグインやWAF設定をご確認ください。';
      }

      return NextResponse.json(
        { error: message, code: errorData.code },
        { status: response.status }
      );
    }

    let result;
    try {
      const responseText = await response.text();
      result = JSON.parse(responseText);
    } catch (e: any) {
      console.error('WordPress Safe Parse Error:', e);
      return NextResponse.json(
        { error: 'WordPressから正しいデータ（JSON）が返されませんでした。URLに /wp-json/ を付けるなどの確認が必要です。' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, url: result.link });
  } catch (error: any) {
    console.error('WordPress post exception:', error);
    return NextResponse.json(
      { error: `サーバー内部エラー: ${error.message}` },
      { status: 500 }
    );
  }
}
