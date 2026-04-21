import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    const accessKey = input.accessKey || process.env.AMAZON_ACCESS_KEY;
    const secretKey = input.secretKey || process.env.AMAZON_SECRET_KEY;
    const associateTag = input.associateTag || process.env.AMAZON_ASSOCIATE_TAG;
    const { keyword } = input;

    if (!accessKey || !secretKey || !associateTag) {
      return NextResponse.json(
        { error: 'システムにAmazon APIの認証情報が設定されていません。管理者に連絡してください。' },
        { status: 400 }
      );
    }

    if (!keyword || keyword.trim() === '') {
      return NextResponse.json(
        { error: '検索キーワードを入力してください。' },
        { status: 400 }
      );
    }

    const host = 'webservices.amazon.co.jp';
    const region = 'us-west-2';
    const service = 'ProductAdvertisingAPI';
    const amzTarget = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
    
    const payload = JSON.stringify({
      Keywords: keyword.trim(),
      Resources: [
        'Images.Primary.Large',
        'Images.Variants.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price',
      ],
      PartnerTag: associateTag.trim(),
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.co.jp',
    });

    const bodyDigest = crypto.createHash('sha256').update(payload).digest('hex');
    
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = datetime.slice(0, 8);
    
    const canonicalUri = '/paapi5/searchitems';
    const canonicalQuerystring = '';
    
    // Headers must be lowercase
    const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${datetime}\nx-amz-target:${amzTarget}\n`;
    const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
    
    const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${bodyDigest}`;
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${datetime}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
    
    const signingKey = getSignatureKey(secretKey.trim(), dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    
    const authorizationHeader = `${algorithm} Credential=${accessKey.trim()}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(`https://${host}${canonicalUri}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript',
        'Accept-Language': 'en-US',
        'Content-Encoding': 'amz-1.0',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Amz-Date': datetime,
        'X-Amz-Target': amzTarget,
        'Authorization': authorizationHeader,
      },
      body: payload,
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Amazon PA-API Error:', JSON.stringify(data, null, 2));
        const errorMessage = data.Errors?.[0]?.Message || JSON.stringify(data);
        return NextResponse.json(
            { error: `Amazon APIエラー: ${errorMessage}` },
            { status: response.status }
        );
    }

    // 楽天と同じ形式 (RakutenProduct互換) に変換
    const items = data.SearchResult?.Items || [];
    const products = items.map((item: any) => {
      const allImages = [];
      if (item.Images?.Primary?.Large?.URL) {
          allImages.push(item.Images.Primary.Large.URL);
      }
      if (item.Images?.Variants) {
          item.Images.Variants.forEach((v: any) => {
              if (v.Large?.URL) allImages.push(v.Large.URL);
          });
      }

      const price = item.Offers?.Listings?.[0]?.Price?.Amount || 0;
      
      return {
        itemName: item.ItemInfo?.Title?.DisplayValue || '不明な商品',
        itemPrice: price,
        itemUrl: item.DetailPageURL,
        imageUrl: allImages[0] || '',
        allImages: allImages,
        itemCaption: (item.ItemInfo?.Features?.DisplayValues || []).join('\n'), // 説明文としてFeaturesを使用
      };
    }).filter((p: any) => p.imageUrl && p.itemPrice > 0);

    return NextResponse.json({ products });

  } catch (error: any) {
    console.error('Amazon商品検索APIルートでエラー:', error);
    return NextResponse.json(
      { error: error.message || 'Amazonの商品検索中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
