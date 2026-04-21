import { NextRequest, NextResponse } from 'next/server';

/**
 * 楽天商品検索 API Route
 * 
 * Next.js TurbopackがNode.jsモジュールをポリフィル/バンドルしようとするため、
 * eval('require')でTurbopackの静的解析を完全にバイパスする。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    const applicationId = input.applicationId || process.env.RAKUTEN_APPLICATION_ID;
    const accessKey = input.accessKey || process.env.RAKUTEN_ACCESS_KEY;
    const { affiliateId, keyword } = input;

    if (!applicationId || applicationId.trim() === '') {
      return NextResponse.json(
        { error: 'システムに楽天アプリケーションIDが設定されていません。管理者に連絡してください。' },
        { status: 400 }
      );
    }

    if (!accessKey || accessKey.trim() === '') {
      return NextResponse.json(
        { error: 'システムに楽天アクセスキーが設定されていません。管理者に連絡してください。' },
        { status: 400 }
      );
    }

    if (!keyword || keyword.trim() === '') {
      return NextResponse.json(
        { error: '検索キーワードを入力してください。' },
        { status: 400 }
      );
    }

    const cleanedApplicationId = applicationId.trim();
    const cleanedAccessKey = accessKey.trim();
    const cleanedAffiliateId = affiliateId ? affiliateId.trim() : '';

    // 最新の楽天APIエンドポイント (UUID形式のアプリIDとアクセスキーが必須)
    let endpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&keyword=${encodeURIComponent(keyword.trim())}&applicationId=${cleanedApplicationId}&accessKey=${cleanedAccessKey}&hits=30`;

    if (cleanedAffiliateId) {
      endpoint += `&affiliateId=${cleanedAffiliateId}`;
    }

    console.log('楽天API リクエストURL:', endpoint.replace(cleanedAccessKey, '***').replace(cleanedApplicationId, '***'));

    // eval('require')でTurbopackの静的解析をバイパスしてNode.jsネイティブモジュールを使用
    const nodeRequire = eval('require');
    const cp = nodeRequire('child_process');
    const nodePath = nodeRequire('path');

    const devReferer = request.headers.get('referer') || 'http://localhost:3000/';
    console.log('--- Rakuten API Referer used ---', devReferer);

    const scriptPath = nodePath.join(process.cwd(), 'scripts', 'rakuten-http.js');
    const inputJson = JSON.stringify({ endpoint, referer: devReferer });

    let resultJson: string;
    try {
      resultJson = cp.execFileSync('node', [scriptPath], {
        encoding: 'utf-8',
        timeout: 15000,
        input: inputJson,
      });
    } catch (execError: any) {
      console.error('子プロセスでエラー:', execError.message);
      if (execError.stdout) {
        console.error('子プロセスstdout:', execError.stdout);
      }
      return NextResponse.json(
        { error: '楽天APIへの接続中にエラーが発生しました。' },
        { status: 500 }
      );
    }

    const result = JSON.parse(resultJson);

    if (result.error) {
      console.error('楽天APIネットワークエラー:', result.error);
      return NextResponse.json(
        { error: '楽天APIへの接続中にネットワークエラーが発生しました。' },
        { status: 500 }
      );
    }

    console.log('楽天API レスポンスステータス:', result.statusCode);
    console.log('楽天API レスポンス本文:', result.body.substring(0, 300));

    let data: any;
    try {
      data = JSON.parse(result.body);
    } catch {
      return NextResponse.json(
        { error: `楽天APIからの応答を解析できませんでした (ステータス: ${result.statusCode})` },
        { status: 500 }
      );
    }

    if (result.statusCode < 200 || result.statusCode >= 300 || data.error || data.errors) {
      const errorDetails = data.error_description || data.error || data.errors?.errorMessage || '不明なエラー';
      console.error('Rakuten API Error:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: `楽天APIエラー: ${errorDetails}` },
        { status: result.statusCode || 500 }
      );
    }

    // 商品データを整形
    if (data.Items && Array.isArray(data.Items)) {
      const products = data.Items.map((item: any) => {
        const mediumImages = item.Item.mediumImageUrls || [];
        const allImages = mediumImages.map((img: any) => img.imageUrl.split('?')[0]); // 解像度制限を解除
        
        return {
          itemName: item.Item.itemName,
          itemPrice: item.Item.itemPrice,
          itemUrl: item.Item.itemUrl,
          imageUrl: allImages[0] || '',
          allImages: allImages,
        };
      });
      return NextResponse.json({ products });
    } else {
      return NextResponse.json({ products: [] });
    }
  } catch (error: any) {
    console.error('楽天商品検索APIルートでエラー:', error);
    return NextResponse.json(
      { error: error.message || '楽天の商品検索中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
