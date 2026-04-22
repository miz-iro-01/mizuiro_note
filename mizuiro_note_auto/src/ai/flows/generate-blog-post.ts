'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('読者の好奇心を刺激し、クリックせずにはいられない魅力的なタイトル'),
  content: z.string().describe('Markdown形式の高品質な記事本文。導入・論理的な展開・読後の価値を網羅した構成'),
  snsThreads: z.string().describe('Threads用のエッセイ風・共感重視テキスト。最高の一文で惹きつけ、続きを読みたくさせる構成。150文字程度'),
  imagePrompt: z.string().describe('記事の世界観を象徴する、幻想的かつプロフェッショナルな画像生成用の英語詳細プロンプト'),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

import { RECOMMENDED_MODELS } from '@/lib/ai-models';

export async function generateBlogPost(input: {
  topic: string;
  keywords?: string;
  instructions?: string;
  persona?: any;
  googleApiKey?: string;
}) {
  const finalKey = input.googleApiKey || process.env.GEMINI_API_KEY;
  const ai = genkit({
    plugins: [googleAI({ apiKey: finalKey })],
  });

  const SYSTEM_PROMPT = `あなたは、noteやBrainで数万人単位のフォロワーを持ち、その言葉一つで読者の価値観を変える力を持つ一流の「文筆家・エッセイスト」です。
単なる情報伝達ではなく、読者の感情を揺さぶり、深い洞察と感動を与える記事を執筆してください。`;

  const USER_PROMPT = `以下のリクエストに基づき、画像生成プロンプトを含む最高品質のnote/Brain記事をJSON形式で作成してください。

【執筆リクエスト】
メインテーマ: ${input.topic}
キーワード: ${input.keywords || '指定なし'}
追加の構成指示: ${input.instructions || '読者の心を打つ、深い洞察を含めてください'}

【運用ペルソナ（筆者像）】
名前: ${input.persona?.name || 'MIZUIRO Writer'}
ターゲット読者: ${input.persona?.targetAudience || '自分らしい生き方を探している人々'}
口調: ${input.persona?.tone || '知的で共感的な、落ち着いた口調'}
背景・専門性: ${input.persona?.description || '人間の葛藤と成長を描くストーリーテラー'}

【記事構成ルール (content)】
1. Markdown記法を多用し、美しいレイアウトを心がけてください。
2. 小見出し(##, ###)を活用し、論理的かつエモーショナルな展開を構築してください。
3. 最後に、読者が明日から一歩踏み出したくなるような、力強くも優しい「結びの言葉」を添えてください。

【画像プロンプト (imagePrompt) ルール】
1. 記事の内容から「象徴的な1枚」を想起させる、具体的かつ詩的な英語プロンプトを生成してください。
2. 背景、光の当たり方、質感(Textures)、雰囲気(Atmosphere)を含めた詳細な指示にしてください。
3. 「Photo-realistic, Cinematic lighting, high quality, 8k」などの品質タグを含めてください。`;

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
