'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const GenerateSocialMediaPostOutputSchema = z.object({
  postText: z.string(),
  imagePrompt: z.string(),
});

import { RECOMMENDED_MODELS } from '@/lib/ai-models';

export async function generateSocialMediaPost(input: any) {
  const finalKey = input.googleApiKey || process.env.GEMINI_API_KEY;
  const ai = genkit({
    plugins: [googleAI({ apiKey: finalKey })],
  });

  let lastError: any = null;
  const modelCandidates = RECOMMENDED_MODELS;

  for (const modelName of modelCandidates) {
    let attempts = 2;
    while (attempts > 0) {
      try {
        const { output } = await ai.generate({
          model: modelName,
          prompt: `あなたはSNSマーケティングのプロです。
トピック: "${input.topic}" について、ThreadsやPinterestでタップされる魅力的な投稿・画像プロンプトを日本語で作成してください。
トーン: "${input.persona?.tone}"、ターゲット: "${input.persona?.targetAudience}"を考慮してください。`,
          output: { schema: GenerateSocialMediaPostOutputSchema },
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

  throw new Error(`投稿生成エラー: すべてのモデルが利用不可能です (${lastError?.message})`);
}
