import { NextRequest, NextResponse } from 'next/server';

/**
 * Threads Server-side Poster (via API Proxy)
 * ブラウザからのCORS制限を回避し、かつ認証エラーを詳細に特定します。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, text, imageUrl, link } = body;

    if (!accessToken || !text) {
      return NextResponse.json(
        { error: 'アクセストークンまたは本文が不足しています。' },
        { status: 400 }
      );
    }

    // 1. コンテンツ（画像/動画）のコンテナ作成
    const createUrl = `https://graph.threads.net/v1.0/me/threads`;
    
    // JSONボディ形式でリクエスト（Meta API推奨の安定した方式）
    const containerBody: any = {
      access_token: accessToken,
      media_type: imageUrl ? 'IMAGE' : 'TEXT',
    };

    if (imageUrl) {
      containerBody.image_url = imageUrl;
      containerBody.text = text; // Threads APIでは画像投稿時のキャプションも `text` パラメータとして送る
    } else {
      containerBody.text = text;
    }

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error('Threads Create Error:', createData);
      return NextResponse.json(
        { error: `Threadsコンテナ作成失敗: ${createData.error?.message || '不明なエラー'}` },
        { status: createRes.status }
      );
    }

    const containerId = createData.id;

    // 2. 公開 (Publish)
    // コンテナ作成直後だと "Resource does not exist" になることがあるため、確実な待機
    await new Promise(resolve => setTimeout(resolve, 5000));

    const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        creation_id: containerId
      })
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      console.error('Threads Publish Error:', publishData);
      return NextResponse.json(
        { error: `Threads公開失敗: ${publishData.error?.message || 'リソース準備エラー。少し時間をおいて再度お試しください。'}` },
        { status: publishRes.status }
      );
    }

    const publishedId = publishData.id;

    // 3. リプライとしてリンクを投稿 (オプション)
    if (link) {
      try {
        console.log('--- Threads Reply Phase ---');
        console.log('Replying to main post ID:', publishedId);
        
        // メイン投稿が完全に認識されるまで待機
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const replyText = `この記事の詳細はブログで公開中！ぜひチェックしてね ✨\n\n${link}`;
        
        // リプライコンテナ作成
        const replyContainerRes = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            media_type: 'TEXT',
            text: replyText,
            reply_to: publishedId
          })
        });
        
        const replyContainerData = await replyContainerRes.json();
        
        if (replyContainerRes.ok) {
          // コンテナ準備待機
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // リプライを公開
          await fetch(publishUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: accessToken,
              creation_id: replyContainerData.id
            })
          });
          console.log('Threads Reply Published successfully');
        } else {
          console.error('Threads Reply Container Error:', replyContainerData);
        }
      } catch (e) {
        console.warn('Threads reply failed (silent):', e);
      }
    }

    return NextResponse.json({ success: true, id: publishedId });
  } catch (error: any) {
    console.error('Threads post exception:', error);
    return NextResponse.json(
      { error: `サーバー内部エラー: ${error.message}` },
      { status: 500 }
    );
  }
}
