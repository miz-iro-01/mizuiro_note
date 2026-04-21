'use server';
/**
 * @fileOverview 楽天の商品検索APIを呼び出して商品情報を取得するためのフロー。
 *
 * 楽天の新APIはRefererヘッダーが必須のため、
 * Next.js API Route (/api/rakuten-search) 経由でリクエストを送信します。
 */

import { z } from 'zod';

const RakutenProductSchema = z.object({
    itemName: z.string(),
    itemPrice: z.number(),
    itemUrl: z.string().url(),
    imageUrl: z.string().url(),
    allImages: z.array(z.string()).optional(),
});

export type RakutenProduct = z.infer<typeof RakutenProductSchema>;

export interface RakutenProductSearchInput {
  applicationId?: string;
  accessKey?: string;
  affiliateId?: string;
  keyword: string;
}

export interface RakutenProductSearchOutput {
  products: RakutenProduct[];
}

export async function searchRakutenProducts(input: RakutenProductSearchInput): Promise<RakutenProductSearchOutput> {
  const headersList = await require('next/headers').headers();
  const referer = headersList.get('referer') || '';
  const userAgent = headersList.get('user-agent') || 'Mozilla/5.0';

  // API Route経由で楽天APIにリクエストを送信
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rakuten-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': referer,
      'User-Agent': userAgent,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '楽天の商品検索中にエラーが発生しました。');
  }

  return data;
}
