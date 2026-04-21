'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('読者が思わずクリックしたくなる、ベネフィットを含んだキャッチーなタイトル'),
  content: z.string().describe('Markdown形式の高品質な記事本文。導入・解決策・3つのポイント・まとめの構成'),
  snsThreads: z.string().describe('Threads用の共感重視のテキスト。画像キャプションとして150文字程度。続きを促す工夫を含む'),
  snsPinterest: z.string().describe('Pinterest用のカタログ的な魅力紹介テキスト。50-100文字程度'),
  snsRakutenRoom: z.string().describe('楽天Room用の「コレ！」するときに使う短いおすすめコメント。100文字程度'),
  imagePrompt: z.string().describe('記事内容にマッチする象徴的なイメージ生成用の英語プロンプト'),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

import { RECOMMENDED_MODELS } from '@/lib/ai-models';

export async function generateBlogPost(input: any) {
  const finalKey = input.googleApiKey || process.env.GEMINI_API_KEY;
  const ai = genkit({
    plugins: [googleAI({ apiKey: finalKey })],
  });

  const SYSTEM_PROMPT = `あなたはアフィリエイトで月収100万円以上を稼ぎ続ける超一流のカリスマブロガー兼SNSマーケターです。
ターゲット読者の「心の痛み」に寄り添い、かつ専門的な知見から商品の魅力を120%引き出す高品質なコンテンツを作成してください。`;

  const USER_PROMPT = `以下の商品情報を元に、高品質なレビュー記事とSNS投稿文をJSON形式で作成してください。

【商品情報】
商品名: ${input.product?.itemName}
価格: ${input.product?.itemPrice}円
商品URL: ${input.product?.itemUrl}
商品詳細: ${input.product?.itemCaption}

【運用ペルソナ】
名前: ${input.persona?.name}
ターゲット: ${input.persona?.targetAudience}
口調: ${input.persona?.tone}
専門性/背景: ${input.persona?.description}

【記事構成ルール (content)】
1. **導入（共感）**: 「あなたは〜で悩んでいませんか？」から開始。
2. **ベネフィット提示**: 解決後の「Happyな未来」を提示。
3. **プロ視点の深掘り（3つの理由）**: 
   - 「## プロが断言！[商品名]が手放せない理由」のように小見出しをつけ、3つのポイントで深掘り。
4. **まとめ**: 読者の背中を押すポジティブな締め。

【SNS投稿ルール】
- **snsThreads**: 商品の「使用感」「感想」「良い所」を250文字以内で情熱的に書く（URLや「続きは〜」の文言はリプライ欄で別途送るため、含めないでください）。
- **snsPinterest**: メリットを羅列したカタログ風短文。
- **snsRakutenRoom**: 楽天Roomに商品を追加する際の一言オススメ欄用コメント。簡潔に商品の良さをアピールしてください。

【注意事項】
- 記事分量は1500-2000文字程度。
- 商品名（input.product.itemName）が「【全品P10倍...】」のように長い場合は、そのまま使わずに「木製ラック」や「美顔器」のように、人間が日常会話で使うような自然な呼称を生成してください。
- Markdown、小見出し(##)、太字を活用。
- 楽天アフィリエイトボタンの記述は不要。
- 出力はすべて日本語、タイトル（title）には必ずベネフィット（利点）を含めてください。`;

  let lastError: any = null;
  const modelCandidates = RECOMMENDED_MODELS;

  for (const modelName of modelCandidates) {
    let attempts = 2;
    while (attempts > 0) {
      try {
        const { output } = await ai.generate({
          model: modelName,
          prompt: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}`,
          output: { schema: GenerateBlogPostOutputSchema },
        });

        if (output) return output;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed, retrying or falling back...`, err.message);

        // 混雑 (503) や レート制限 (429) の場合は少し待機してリトライ
        if (err.message?.includes('503') || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
          const waitSec = parseFloat(err.message.match(/retry in ([\d.]+)/)?.[1] || '5');
          await new Promise(resolve => setTimeout(resolve, (waitSec + 1) * 1000));
          attempts--;
          continue;
        }
        // それ以外のエラーは次のモデルへ
        break;
      }
    }
  }

  throw new Error(`記事生成エラー: すべてのモデルが利用不可能です (${lastError?.message})`);
}
