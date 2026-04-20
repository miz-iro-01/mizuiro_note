# Blogger リフレッシュトークンによる自動更新実装計画

ご提案ありがとうございます。Blogger（Google API）のアクセストークン有効期限切れ問題を解決するため、初回連携時に保存しているリフレッシュトークン（`refreshToken`）を利用して、バックグラウンドで自動的に新しいアクセストークンを取得する仕組みを実装します。

## User Review Required

> [!WARNING]
> 本機能を実装・動作させるには、Google Cloud Console から **「クライアントID（Client ID）」** および **「クライアントシークレット（Client Secret）」** を取得し、プロダクトの環境変数（`.env` ファイルおよびVercel本番環境）に設定していただく必要があります。
> 
> 環境設定に必要なキー変数は以下の通りです：
> - `GOOGLE_CLIENT_ID`
> - `GOOGLE_CLIENT_SECRET`

以上の設定が必要であることをご了承いただけますでしょうか？

## Proposed Changes

---

### UI・設定関連の再調整

#### [MODIFY] integrations-form.tsx (file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/dashboard/settings/components/integrations-form.tsx)
- 前回の修正で推奨から外した「OAuth連携（自動更新モード）」の表記をメイン推奨へと戻します。
- UI上に、自動更新を活用するには `.env` にGoogleクライアント情報が設定されている必要がある旨の簡単な案内を追加します。

### バックグラウンド処理・自動再取得APIの実装

#### [NEW] route.ts (file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/api/auth/refresh-google/route.ts)
- `refreshToken` を受け取り、Googleのトークンエンドポイント (`https://oauth2.googleapis.com/token`) へリクエストを投げて新しい `accessToken` を発行するAPIルートを新規作成します。
- この通信にはサーバー側に設定した `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を使用します。

### コンテンツスタジオでの自動再試行

#### [MODIFY] blog-post-view.tsx (file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/dashboard/content-studio/components/blog-post-view.tsx)
- Bloggerへの投稿 (`postToBlogger`) 実行時に `401 Unauthorized` （有効期限切れ）エラーを検知するロジックを追加します。
- エラー検知時、かつユーザーデータに `refreshToken` が保存されている場合、先ほど作成した新規APIを叩いて新しいアクセストークンを取得します。
- 取得に成功した場合、Firestore の `accessToken` を最新のものに上書き保存し、ユーザーにもう一度手間をかけさせることなく **自動で投稿を再試行** します。
- 環境変数が未設定などの理由でリフレッシュに失敗した場合は、手動での再連携や秘密メールの利用を促すエラーを表示します。

---

## Open Questions

- 新規APIの作成と連携処理の実装を進めます。実装開始してもよろしいでしょうか？
- `GOOGLE_CLIENT_ID` および `GOOGLE_CLIENT_SECRET` の取得方法についてはご存知でしょうか？（必要であれば手順をご案内します）

## Verification Plan

### Manual Verification
- `.env` に意図的に古い（期限切れの）Bloggerアクセストークンを設定した状態で投稿を試みます。
- バックグラウンドでAPIが走り、自動的に新しいトークンが取得されて投稿が成功することを確認します。
- Firestoreデータベース内の `accessToken` が自動で書き換わることを確認します。
