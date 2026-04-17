# 実装タスク：メール認証・埋め込み型決済・管理者権限

- [x] パッケージ追加: `@stripe/stripe-js` および `@stripe/react-stripe-js` をインストール。
- [x] 管理者権限の強制適用 (`DashboardLayout`, 共通フック等): 管理者の場合は UI 上も実質 `plan: 'pro'` として振る舞うロジックを追加。
- [x] 新規登録時のメール認証対応 (`src/app/signup/page.tsx`):
  - [x] `sendEmailVerification` の追加。
  - [x] メール認証が完了するまでダッシュボードへ遷移させないブロックUIの実装。
- [x] Stripe APIの書き換え (`src/app/api/stripe/checkout/route.ts`):
  - [x] `ui_mode: 'embedded'` を設定。
  - [x] リダイレクト用URLではなく、`client_secret` と `publishableKey` を直接フロントエンドへ返却するよう変更。
- [x] 埋め込み決済画面の実装・UI調整 (`src/app/dashboard/layout.tsx`):
  - [x] `<EmbeddedCheckoutProvider>` および `<EmbeddedCheckout>` を組み込む。
  - [x] UI調整（「7日間無料トライアル」を大きく強調し、月額以降の注意書きを最下部に小さく配置）。
