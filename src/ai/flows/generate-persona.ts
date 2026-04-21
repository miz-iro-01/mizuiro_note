'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const PersonaSchema = z.object({
  name: z.string().describe('ペルソナの名前 (例: テック好きの佐藤さん)'),
  tone: z.string().describe('コンテンツのトーン (例: 親しみやすく、少し専門的)'),
  imageStyle: z.string().describe('生成される画像のスタイル (例: 写実的でモダンなオフィス風景)'),
  targetAudience: z.string().describe('ターゲット層の詳細 (例: 30代の効率を重視するビジネスパーソン)'),
  description: z.string().describe('詳しいキャラクター設定や運用方針'),
});

export type GeneratedPersona = z.infer<typeof PersonaSchema>;

export interface GeneratePersonaInput {
  topic: string;
  googleApiKey: string;
}

import { RECOMMENDED_MODELS } from '@/lib/ai-models';

export async function generatePersona({ topic, googleApiKey }: GeneratePersonaInput): Promise<GeneratedPersona> {
  const ai = genkit({
    plugins: [googleAI({ apiKey: googleApiKey })],
  });

  let lastError: any = null;
  const modelCandidates = RECOMMENDED_MODELS;

  for (const modelName of modelCandidates) {
    let attempts = 2;
    while (attempts > 0) {
      try {
        const { output } = await ai.generate({
          model: modelName,
          prompt: `トピック: "${topic}" に基づいて、アフィリエイトブログやSNS（Pinterest, Threads等）での発信に最適な「ペルソナ（キャラクター）」を1つ作成してください。
日本語で、親しみやすく、かつ成果に結びつきやすい具体的な設定を行ってください。`,
          output: {
            schema: PersonaSchema,
          },
        });

        if (output) return output as GeneratedPersona;
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

  throw new Error(`ペルソナ生成エラー: すべてのモデルが利用不可能です (${lastError?.message})`);
}
