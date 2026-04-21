import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';

// 現在のAPIキーで利用可能なモデルをリストアップして表示する診断関数
export async function diagnoseAvailableModels(apiKey: string) {
  try {
    console.log('--- Gemini API Model Diagnosis ---');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    if (data.models) {
      const modelNames = data.models.map((m: any) => m.name.replace('models/', ''));
      console.log('Available Models:', modelNames);
      return modelNames;
    } else {
      console.error('No models found or error:', data);
      return [];
    }
  } catch (error) {
    console.error('Diagnosis failed:', error);
    return [];
  }
}
