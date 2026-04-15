# アプリ連携のロールバックと品質維持計画

ユーザー様の本来の意図に沿い、アプリ（MIZUIRO）のソースコードから OpenRouter 関連のロジックを削除（クリーンアップ）し、純粋な Google Gemini 連携の状態に戻します。
同時に、ユーザー様にご提供いただいた「お手本」を再現できる高度なプロンプト指示は維持し、アプリの提供価値を最大化します。

## ユーザーレビューが必要
> [!IMPORTANT]
> **OpenRouterの扱い**
> アプリの機能としては OpenRouter を使用せず、ユーザー様が設定された Google API キー（Gemini）のみで動作するように戻します。

## 提案された変更

### 1. OpenRouter 関連のクリーンアップ (ロールバック)
- #### [DELETE] [openrouter-api.ts](file:///C:/Users/user/.gemini/antigravity/mizuiroaout/src/lib/openrouter-api.ts)
    - アプリのソースコードから完全に削除します。
- #### [MODIFY] [ai-models.ts](file:///C:/Users/user/.gemini/antigravity/mizuiroaout/src/lib/ai-models.ts)
    - 推奨モデルリストから OpenRouter の Gemma を削除します。

### 2. 生成ロジックの再構築（高品質 Gemini 対応）
- #### [MODIFY] [generate-blog-post.ts](file:///C:/Users/user/.gemini/antigravity/mizuiroaout/src/ai/flows/generate-blog-post.ts)
    - 分岐ロジックを削除し、Gemini (Genkit) のみで動作するように戻します。
    - **【重要】** プロンプト内の「導入（共感）→解決（Happyな未来）→3つの深掘りポイント→まとめ」という構成指示は維持し、Gemini がお手本のような記事を生成するようにします。
    - `snsThreads` と `snsPinterest` の分離出力も、UIの利便性を考え Gemini にそのまま実行させます。

### 3. 設定ファイル
- #### [MODIFY] [.env](file:///C:/Users/user/.gemini/antigravity/mizuiroaout/.env)
    - `OPENROUTER_API_KEY` はそのまま残し、私（Antigravity）が作業時に参照できるようにします。

## オープンな質問
- SNS出力（Threads/Pinterest）を分けた点については、UIの使い勝手が向上しているため維持することを推奨しますが、よろしいでしょうか？

## 修正後の動作（想定）
1. ユーザー様が使い慣れた Gemini API キーで、ご提供いただいたサンプルのような素晴らしいブログ記事が届く。
2. アプリのコードは、OpenRouter という外部プロバイダーに依存しない、元の構成のまま進化する。
