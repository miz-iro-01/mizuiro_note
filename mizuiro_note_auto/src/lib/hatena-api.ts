/**
 * Hatena Blog AtomPub API client
 */

interface postToHatenaParams {
  hatenaId: string;
  blogId: string;
  apiKey: string;
  title: string;
  content: string; // Markdown or HTML
  status?: 'yes' | 'no'; // draft
}

/**
 * Publishes a post to Hatena Blog using AtomPub API
 */
export async function postToHatena({
  hatenaId,
  blogId,
  apiKey,
  title,
  content,
  status = 'no' // 'yes' means draft=yes
}: postToHatenaParams) {
  const apiUrl = `https://blog.hatena.ne.jp/${hatenaId}/${blogId}/atom/entry`;

  // Create XML entry
  const entryXml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:app="http://www.w3.org/2007/app">
  <title>${title}</title>
  <author><name>${hatenaId}</name></author>
  <content type="text/html">${content}</content>
  <app:control>
    <app:draft>${status}</app:draft>
  </app:control>
</entry>`;

  // Auth: Basic 認証 (hatenaId:apiKey を Base64化)
  // エンコード時のトラブルを避けるため、JavaScriptの標準的な方法で安全にエンコードします
  const authString = btoa(unescape(encodeURIComponent(`${hatenaId}:${apiKey}`)));

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/atom+xml;charset=utf-8',
    },
    body: entryXml,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = await response.text();
    } catch (e) {
      errorDetail = 'レスポンス内容を確認できませんでした。';
    }
    
    // エラー詳細を人間が読みやすい形式に整形
    const message = response.status === 401 ? 'APIキーまたはユーザーIDが間違っています。' :
                    response.status === 404 ? 'ブログIDが見つかりません。設定画面でドメイン名が正しいか確認してください。' :
                    `通信エラー (${response.status}: ${response.statusText})`;
    
    throw new Error(`はてなブログ: ${message}`);
  }

  return await response.text();
}
