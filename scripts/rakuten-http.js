/**
 * 楽天API HTTPリクエストスクリプト
 * 
 * Next.js Turbopackの影響を受けない独立プロセスとして実行される。
 * Refererヘッダーを確実に送信するために使用。
 * 
 * 引数: endpoint URL をstdinからJSON形式で受け取り、結果をstdoutにJSON形式で出力する
 */
const https = require('https');

let inputData = '';
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const { endpoint, referer } = JSON.parse(inputData);
    const url = new URL(endpoint);

    let cleanReferer = referer || 'https://studio-5142474284-ef60d.web.app/';
    let urlObj;
    try {
      urlObj = new URL(cleanReferer);
    } catch {
      urlObj = new URL('https://studio-5142474284-ef60d.web.app/');
    }

    // もしOriginがlocalhostや開発・テスト系の場合は、本番のドメインに偽装して楽天に怒られないようにする
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' || urlObj.hostname === '') {
      cleanReferer = 'https://studio-5142474284-ef60d.web.app/';
      urlObj = new URL(cleanReferer);
    }
    
    const cleanOrigin = `${urlObj.protocol}//${urlObj.host}`;

    // クエリパラメータから認証情報を取得
    const appId = url.searchParams.get('applicationId') || '';
    const accKey = url.searchParams.get('accessKey') || '';
    
    // query params はそのまま維持するため削除処理を行わない

    const requestHeaders = {
        'Referer': cleanReferer,
        'Referrer': cleanReferer,
        'Origin': cleanOrigin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    };

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: requestHeaders,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => {
        process.stdout.write(JSON.stringify({ statusCode: res.statusCode, body: body }));
      });
    });
    
    req.on('error', (e) => {
      process.stdout.write(JSON.stringify({ statusCode: 0, body: '', error: e.message }));
    });
    
    req.end();
  } catch (e) {
    process.stdout.write(JSON.stringify({ statusCode: 0, body: '', error: e.message }));
  }
});
