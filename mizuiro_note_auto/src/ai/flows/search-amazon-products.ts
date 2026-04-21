'use server';
/**
 * @fileOverview Amazonの商品検索APIを呼び出して商品情報を取得するためのフロー。
 */

import { type RakutenProduct } from './search-rakuten-products';

export interface AmazonProductSearchInput {
  accessKey?: string;
  secretKey?: string;
  associateTag?: string;
  keyword: string;
}

export interface AmazonProductSearchOutput {
  products: RakutenProduct[];
}

export async function searchAmazonProducts(input: AmazonProductSearchInput): Promise<AmazonProductSearchOutput> {
  const headersList = await require('next/headers').headers();
  const referer = headersList.get('referer') || '';
  const userAgent = headersList.get('user-agent') || 'Mozilla/5.0';

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/amazon-search`, {
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
    throw new Error(data.error || 'Amazonの商品検索中にエラーが発生しました。');
  }

  return data;
}
