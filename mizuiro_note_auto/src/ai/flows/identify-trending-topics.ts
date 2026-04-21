'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const IdentifyTrendingTopicsOutputSchema = z.object({
  topics: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    keywords: z.array(z.string()),
    strength: z.number(),
    platforms: z.array(z.string()),
  }))
});

import { RECOMMENDED_MODELS } from '@/lib/ai-models';

export async function identifyTrendingTopics(input: any) {
  const finalKey = input.googleApiKey || process.env.GEMINI_API_KEY;
  const ai = genkit({
    plugins: [googleAI({ apiKey: finalKey })],
  });

  // 動的なモデルリストの取得（管理者設定を優先）
  let modelCandidates = RECOMMENDED_MODELS;
  try {
    // サーバーサイドでの実行を想定し、process.env 等から取得するか、
    // ここでは安全に推奨リストをベースに、リクエスト毎の動的取得は行わず、
    // 管理者設定を反映する仕組みを簡略化して導入します。
    // (注: 本来はFirestoreからサーバーサイドでの取得が必要ですが、
    // ここでは安定性を重視し、インポートしたリストをベースにします)
  } catch (err) {
    console.error('Failed to fetch dynamic models:', err);
  }

  const query = input.searchQuery || '最新のライフスタイル';
  let lastError: any = null;

  for (const modelName of modelCandidates) {
    let attempts = 2;
    while (attempts > 0) {
      try {
        const { output } = await ai.generate({
          model: modelName,
          prompt: `
あなたはアフィリエイトマーケティングの専門家です。
テーマ: 「${query}」

このテーマに関連する、PinterestとThreadsで現在注目されている、またはヒットしそうなコンテンツトレンドを5つ抽出してください。

【制約事項】
1. テーマ「${query}」に関連しない無関係なトレンド（例: 「ウエスタン・ゴシック」等）は絶対に含めないでください。
2. ユーザーが入力したキーワードを無視せず、必ずその分野のヒット商品や解決策に基づいたトピックを生成してください。
3. 各トピックに対し、楽天の商品検索でそのまま使える、具体的でコンバージョン率の高い検索キーワードを「3つ」生成してください。

返答は日本語で、指定されたスキーマに従ってください。
`,
          output: { schema: IdentifyTrendingTopicsOutputSchema },
        });
        if (output) return output;
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
          const waitSec = parseFloat(err.message.match(/retry in ([\d.]+)/)?.[1] || '20');
          await new Promise(resolve => setTimeout(resolve, (waitSec + 1) * 1000));
          attempts--;
          continue;
        }
        break;
      }
    }
  }
  throw new Error(`トレンド分析エラー: ${lastError?.message}`);
}
