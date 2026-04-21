# AI 開発プロセスにおけるトークン最適化ガイド (OpenRouter 活用編)

このガイドでは、AIアシスタント（Antigravity等）と共同開発を行う際、メインモデルのトークン消費を抑えつつ、最新の高性能オープンモデルを活用して「高品質・低コスト」な開発環境を構築する手順を解説します。

## 概要
Google Gemini 等のクローズドモデルに直接すべてを任せるのではなく、**OpenRouter** 経由で **Gemma 4** や **Llama 3** といったモデルに「思考のアウトソーシング」をさせることで、メインコンテキストの蓄積を回避し、トークン制限（Window Size）やコストを最適化します。

## 導入手順

### 1. API キーの準備
[OpenRouter](https://openrouter.ai/) でアカウントを作成し、API キーを取得して `.env` に追加します。

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx...
```

### 2. 思考補助ツールの配置
プロジェクトの `.agents/skills/` ディレクトリに、OpenRouter を呼び出すためのスクリプト（`openrouter_think.js`）を配置します。

```javascript
// openrouter_think.js の例 (Node.js)
const fetch = require('node-fetch'); // または標準のfetch
async function askAI(prompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "google/gemma-4", 
      "messages": [{"role": "user", "content": prompt}]
    })
  });
  const data = await response.json();
  console.log(data.choices[0].message.content);
}
```

### 3. エージェントへの指示 (Instructions)
AIアシスタントの行動指針（`AGENTS.md` やシステムプロンプト）に、以下のルールを記述します。

> **思考アウトソーシング仕様：**
> - 高度な推論やコード生成時は、まず `.agents/skills/openrouter_think.js` を実行し、最高ランクのオープンモデルから知見を得よ。
> - 得られた知見の「エッセンス」のみを回答に反映し、メインのメッセージ履歴に巨大な情報を残さないことで、トークン使用量を最適化（ほぼゼロ化）せよ。

## 運用のメリット
1.  **トークンの温存**: メインモデルのコンテキストウィンドウが汚れず、長期間のプロジェクトでも思考の精度が落ちません。
2.  **最新モデルの即時利用**: OpenRouter を介すことで、Llama 4 や Gemma 4 など、リリース直後のモデルをすぐに開発フェーズに投入できます。
3.  **役割分担の最適化**: 対話はレスポンスの速いモデル（Gemini Flash等）、思考は推論の鋭い重量級モデル（Gemma 2 27B/Gemma 4等）と使い分けることができます。

---
作成：MIZUIRO AI Platform Development Team
