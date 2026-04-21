import { NextRequest, NextResponse } from 'next/server';

/**
 * Hatena Blog AtomPub Server-side Proxy
 * ブラウザからのCORS制限を回避し、かつ認証エラーを詳細に特定します。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hatenaId, blogId, apiKey, title, content } = body;

    // デバッグログ
    console.log('--- Hatena Post Request ---');
    console.log('hatenaId:', hatenaId);
    console.log('blogId:', blogId);
    console.log('title:', title);

    if (!hatenaId || !blogId || !apiKey || !title || !content) {
      return NextResponse.json(
        { error: '設定内容（ID、ドメイン、APIキー）または投稿内容が不足しています。' },
        { status: 400 }
      );
    }

    // ブログID（ドメイン）の整形：URL形式で入力された場合に備えてドメイン部分だけ抽出
    // 例: https://s-kimichan.hatenablog.com/ -> s-kimichan.hatenablog.com
    let cleanBlogId = blogId.replace(/https?:\/\//, '').split('/')[0].trim();
    const apiUrl = `https://blog.hatena.ne.jp/${hatenaId}/${cleanBlogId}/atom/entry`;

    // XMLの作成 (すべてHTMLとして送信)
    const entryXml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:app="http://www.w3.org/2007/app">
  <title><![CDATA[${title}]]></title>
  <author><name>${hatenaId}</name></author>
  <content type="text/html"><![CDATA[${content}]]></content>
  <app:control>
    <app:draft>no</app:draft>
  </app:control>
</entry>`;

    // 認証ヘッダーの作成 (Basic認証 - 文字化け回避)
    const authString = Buffer.from(`${hatenaId}:${apiKey}`, 'utf-8').toString('base64');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/atom+xml;charset=utf-8',
        'User-Agent': 'MIZUIRO-Studio/1.1',
      },
      body: entryXml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hatena API Error Response:', errorText);

      let message = 'はてなブログ側でエラーが発生しました。';
      
      if (response.status === 401) {
        message = '認証エラー：はてなIDまたはAPIキー（AtomPub用）が正しくありません。';
      } else if (response.status === 404) {
        message = `ブログIDエラー：ブログ「${cleanBlogId}」が見つかりません。ドメイン名（例: abc.hatenablog.com）が正しいか確認してください。`;
      } else if (response.status === 403) {
        message = '権限エラー：API利用が許可されていないか、パスワード（APIキー）が違います。';
      } else {
        message = `APIエラー (${response.status}): ${errorText.substring(0, 100)}`;
      }

      return NextResponse.json({ error: message }, { status: response.status });
    }

    const responseText = await response.text();
    // AtomPubの成功レスポンスから <link rel="alternate" href="..."/> を抽出
    const urlMatch = responseText.match(/<link [^>]*rel="alternate"[^>]*href="([^"]+)"/);
    const blogUrl = urlMatch ? urlMatch[1] : `https://${cleanBlogId}/entries/`;

    return NextResponse.json({ success: true, url: blogUrl });
  } catch (error: any) {
    console.error('Hatena post exception:', error);
    return NextResponse.json(
      { error: `サーバー内部エラー: ${error.message}` },
      { status: 500 }
    );
  }
}
