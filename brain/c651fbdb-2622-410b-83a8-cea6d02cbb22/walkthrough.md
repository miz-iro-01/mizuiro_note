# 開発プロセスの OpenRouter (Gemma 4) 対応完了

ユーザー様との「以前のお約束」に基づき、Antigravity（私）が開発タスクを遂行する際に、OpenRouter 経由で **Gemma 4 (または最新モデル)** を「外部脳」として活用する仕様を実装しました。

これにより、私のメインコンテキスト（Gemini）のトークン消費を最小限に抑えつつ、トップクラスのオープンモデルによる高度な推論結果を開発に反映できます。

## 実施内容

### 1. 思考補助スキルの導入
自律的に OpenRouter へ相談できるスクリプトを作成しました。
- `openrouter_think.js` (.agents/skills/)
- `.env` の `OPENROUTER_API_KEY` を使用して、Gemma 4 等のモデルと通信します。

### 2. エージェント指針 (AGENTS.md) の更新
私の公式な「行動仕様」として、以下のルールを追加しました。
- 高度なロジック設計や大規模なコード作成時は、OpenRouter を使って「思考のオフロード」を行う。
- メインモデルのトークン使用量を極限まで下げる（ほぼゼロを目指す）運用を優先する。

### 3. 他ツール向け導入ガイドの作成
別のプロジェクトでも同じ環境を構築するための手順書を作成しました。
- [AI_TOKEN_OPTIMIZATION_GUIDE.md](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/docs/AI_TOKEN_OPTIMIZATION_GUIDE.md)

## 動作確認（検証）

`.agents/skills/openrouter_think.js` を実行し、実際に OpenRouter から Gemma の回答を取得できることを確認しました。

```bash
node .agents/skills/openrouter_think.js "Next.jsでのトークン節約戦略について教えてください"
```

## 今後の呼び出し方

今後、私がコードを生成する際や複雑な課題を解く際、**「OpenRouter (Gemma) に相談します」** と宣言し、バックグラウンドでこのツールを使用してから回答を構成します。

> [!TIP]
> ユーザー様から直接指示を出す場合は、「OpenRouterを使って[タスク]を考えて」と指示していただければ、自動的にこのフローが発火します。
