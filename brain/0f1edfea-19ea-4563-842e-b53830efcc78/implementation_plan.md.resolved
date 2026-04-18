# 3つの新機能追加プラン

## 概要
1. 管理者パネルのタブ移動時に未保存変更の確認ダイアログを表示
2. 商品検索にAmazonアソシエイトを追加
3. 出力連携先に楽天Roomを追加

---

## 1. タブ移動時の未保存変更確認ダイアログ

### 対象ファイル
#### [MODIFY] [page.tsx](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/admin/page.tsx)
- `Tabs` コンポーネントの `onValueChange` イベントをインターセプトし、フォームの初期値と現在の値を比較
- 変更がある場合、`AlertDialog` で「保存する / 保存しない / キャンセル」の3択を表示
- 「保存する」を選ぶとそのタブのsave関数を実行してからタブ移動

---

## 2. 商品検索にAmazonアソシエイトを追加

### 基本方針
楽天商品検索と同列にAmazon PA-API v5を使った検索を追加する。ユーザーは設定画面でAmazonアソシエイトの認証情報を入力し、検索時にソースを選択できるようにする。

### 対象ファイル

#### [NEW] [amazon-search/route.ts](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/api/amazon-search/route.ts)
- Amazon PA-API v5の商品検索エンドポイント
- リクエストにAWS署名V4を付与して `SearchItems` をコールする
- レスポンスを楽天と同じ `RakutenProduct` 互換形式に変換して返却

#### [NEW] [search-amazon-products.ts](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/ai/flows/search-amazon-products.ts)
- Amazon検索のクライアント関数（サーバーアクション）
- 楽天の `searchRakutenProducts` と同様のインターフェース

#### [MODIFY] [rakuten-product-searcher.tsx](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/dashboard/content-studio/components/rakuten-product-searcher.tsx)
- コンポーネント名を `ProductSearcher`（汎用化）に変更
- 検索ソース切替タブ（楽天 / Amazon）を追加
- 選択されたソースに応じてAPIを呼び分ける
- 結果表示のUIは共通化（同一の `Product` 型で統一）

#### [MODIFY] [integrations-form.tsx](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/dashboard/settings/components/integrations-form.tsx)
- Amazon PA-API認証情報の入力欄を追加:
  - `amazonAccessKey`（アクセスキー）
  - `amazonSecretKey`（シークレットキー）
  - `amazonAssociateTag`（アソシエイトタグ）

> [!IMPORTANT]
> Amazon PA-API v5はAWS署名V4が必須です。これには`crypto`モジュールを使ったHMAC-SHA256署名が必要ですが、Next.jsのAPI Routeはサーバーサイドで実行されるため問題なく実装可能です。

---

## 3. 出力連携先に楽天Roomを追加

### 基本方針
楽天Roomには**公式の投稿APIが存在しません**。そのため、以下の方式で対応します:
- 楽天Roomの商品ページURLを生成し、ユーザーがワンクリックでRoomに投稿できるリンクを自動生成
- 投稿時に楽天Room用のテキスト（おすすめコメント）をAIで自動生成
- 投稿チェックボックスに「楽天Room」を追加し、選択時にRoom用URLと投稿テンプレートをクリップボードにコピー

### 対象ファイル

#### [MODIFY] [generate-blog-post.ts](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/ai/flows/generate-blog-post.ts)
- AIプロンプトに楽天Room用の短いおすすめコメント生成を追加（`snsRakutenRoom` フィールド）

#### [MODIFY] [blog-post-view.tsx](file:///c:/Users/user/.gemini/antigravity/mizuiroaout/src/app/dashboard/content-studio/components/blog-post-view.tsx)
- 投稿先チェックボックスに「楽天Room」を追加
- 投稿時の処理: Room用テキスト + 商品URL をクリップボードにコピーし、楽天Roomアプリ（またはWebサイト）を別タブで開く

> [!WARNING]
> 楽天Roomには投稿APIがないため、完全自動投稿はできません。代わりにクリップボードコピー＋Room誘導の半自動方式になります。

---

## 検証プラン

### 自動テスト
- 各新規ファイルのコンパイルエラーチェック（`npm run dev` でホットリロード確認）

### 手動確認
1. 管理者パネルで値を変更してからタブを切り替え → 確認ダイアログが出るか
2. 設定画面にAmazon PA-API設定欄が表示されるか
3. 商品検索でAmazonタブが表示され、検索できるか
4. 記事生成後の一括投稿セクションに「楽天Room」チェックボックスが表示されるか
