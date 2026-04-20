# Blogger 自動更新（リフレッシュトークン）実装タスクリスト

- `[x]` バックグラウンド再取得APIの実装
  - `[x]` `/api/auth/refresh-google/route.ts` 新規作成
- `[x]` コンテンツスタジオの自動再試行ロジックの実装
  - `[x]` `blog-post-view.tsx` のエラーハンドリング修正（401検知 -> リフレッシュ -> 再試行 -> DB保存）
- `[x]` `integrations-form.tsx` のUI調整
