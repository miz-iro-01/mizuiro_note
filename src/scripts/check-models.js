const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// .env から直接読み込むか、引数から取得するか
const apiKey = process.env.GOOGLE_GENKIT_API_KEY || "AIza..."; // ここは実行時に実際のキーを確認する必要がありますが、まずは環境変数から

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENKIT_API_KEY);
    // モデル一覧を取得するメソッド（REST API経由）
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENKIT_API_KEY}`);
    const data = await response.json();
    
    console.log("=== Available Models ===");
    if (data.models) {
      data.models.forEach(m => {
        console.log(`${m.name} : ${m.supportedGenerationMethods}`);
      });
    } else {
      console.log("No models found. Response:", JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
