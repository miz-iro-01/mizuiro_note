import { NextRequest, NextResponse } from 'next/server';

/**
 * Blogger 投稿 API ルート
 * 
 * アクセストークンで投稿を試み、失敗した場合は
 * リフレッシュトークンを使って自動更新してリトライします。
 * サーバーサイドで完結するため、エラーメッセージが確実に返されます。
 */

const BLOGGER_API_BASE = 'https://www.googleapis.com/blogger/v3';

async function getBloggerBlogs(accessToken: string) {
  const response = await fetch(`${BLOGGER_API_BASE}/users/self/blogs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json();
    const status = response.status;
    throw { status, message: error.error?.message || 'Bloggerブログの取得に失敗しました。' };
  }

  const data = await response.json();
  return data.items || [];
}

async function postToBloggerAPI(accessToken: string, title: string, content: string, blogId?: string) {
  let targetBlogId = blogId;

  if (!targetBlogId) {
    const blogs = await getBloggerBlogs(accessToken);
    if (blogs.length === 0) {
      throw { status: 404, message: 'Bloggerブログが見つかりませんでした。先にBloggerでブログを作成してください。' };
    }
    targetBlogId = blogs[0].id;
  }

  const response = await fetch(`${BLOGGER_API_BASE}/blogs/${targetBlogId}/posts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'blogger#post',
      title,
      content,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    const status = response.status;
    throw { status, message: error.error?.message || 'Bloggerへの投稿に失敗しました。' };
  }

  return await response.json();
}

async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('サーバーに GOOGLE_CLIENT_ID または GOOGLE_CLIENT_SECRET が設定されていません。');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Google token refresh failed:', data);
    throw new Error(data.error_description || data.error || 'トークンのリフレッシュに失敗しました。');
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken, title, content, blogId } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です。' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'アクセストークンが提供されていません。設定画面からBloggerと連携してください。' },
        { status: 401 }
      );
    }

    // 1回目の投稿試行
    try {
      const result = await postToBloggerAPI(accessToken, title, content, blogId);
      return NextResponse.json({ success: true, url: result.url, id: result.id });
    } catch (firstError: any) {
      console.log('Blogger投稿1回目失敗:', firstError.message, '(status:', firstError.status, ')');

      // 認証エラーかどうか判定
      const isAuthError = firstError.status === 401 || 
        firstError.status === 403 ||
        (firstError.message && (
          firstError.message.toLowerCase().includes('invalid authentication credentials') ||
          firstError.message.toLowerCase().includes('invalid credentials') ||
          firstError.message.toLowerCase().includes('token')
        ));

      if (!isAuthError) {
        // 認証エラー以外はそのまま返す
        return NextResponse.json(
          { error: firstError.message || 'Bloggerへの投稿に失敗しました。', errorType: 'api_error' },
          { status: firstError.status || 500 }
        );
      }

      // リフレッシュトークン: クライアントから送信されたもの → .env のフォールバック
      const effectiveRefreshToken = refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
      
      if (!effectiveRefreshToken) {
        return NextResponse.json(
          { 
            error: '認証の期限が切れています。リフレッシュトークンがないため自動更新できません。設定画面からBloggerの「再連携」を行うか、.envにGOOGLE_REFRESH_TOKENを設定してください。',
            errorType: 'auth_expired_no_refresh'
          },
          { status: 401 }
        );
      }

      // 2回目: リフレッシュしてリトライ
      console.log('リフレッシュトークンで自動更新を試行します...（ソース:', refreshToken ? 'Firestore' : '.env', '）');
      try {
        const newAccessToken = await refreshGoogleToken(effectiveRefreshToken);
        console.log('トークンのリフレッシュに成功しました。再投稿を試みます...');
        
        const retryResult = await postToBloggerAPI(newAccessToken, title, content, blogId);
        
        return NextResponse.json({ 
          success: true, 
          url: retryResult.url, 
          id: retryResult.id,
          newAccessToken, // クライアント側でFirestoreを更新するために返す
          refreshed: true
        });
      } catch (refreshError: any) {
        console.error('リフレッシュ後のリトライも失敗:', refreshError);
        return NextResponse.json(
          { 
            error: `自動更新に失敗しました: ${refreshError.message || '不明なエラー'}。設定画面からBloggerの「再連携」を行ってください。`,
            errorType: 'refresh_failed'
          },
          { status: 401 }
        );
      }
    }
  } catch (error: any) {
    console.error('Blogger post API error:', error);
    return NextResponse.json(
      { error: error.message || 'サーバー内部エラーが発生しました。' },
      { status: 500 }
    );
  }
}
