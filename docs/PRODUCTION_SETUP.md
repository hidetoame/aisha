# 本番環境セットアップガイド

## 概要
AISHAプロジェクトの本番環境はGoogle Cloud Runで動作します。

## 必要なGitHub Secrets

以下のシークレットをGitHubリポジトリに設定する必要があります：

### 基本設定
- `GCP_SA_KEY`: Google Cloud Platform サービスアカウントキー（JSON形式）
- `DJANGO_SECRET_KEY`: Django用のシークレットキー（強力なランダム文字列）
- `DATABASE_URL`: Cloud SQL PostgreSQLデータベースURL
  - 形式: `postgresql://username:password@/dbname?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db`
  - Cloud SQLインスタンス: `aisha-db` (PostgreSQL 15)

### Stripe設定（本番キー）
- `STRIPE_PUBLISHABLE_KEY_LIVE`: Stripe本番用公開可能キー
- `STRIPE_SECRET_KEY_LIVE`: Stripe本番用シークレットキー
- `STRIPE_WEBHOOK_SECRET_LIVE`: Stripe Webhookシークレット

### Firebase設定
- `VITE_FIREBASE_API_KEY`: Firebase APIキー
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase認証ドメイン
- `VITE_FIREBASE_PROJECT_ID`: FirebaseプロジェクトID
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe公開可能キー（フロントエンド用）

### その他のAPI設定
- `SUZURI_API_TOKEN`: SUZURI APIトークン
- `GEMINI_API_KEY`: Gemini APIキー
- `VITE_CLIPDROP_API_KEY`: ClipDrop APIキー
- `GCS_CREDENTIALS_JSON`: Google Cloud Storage認証情報（JSON形式）

## デプロイメントフロー

1. mainブランチへのプッシュで自動デプロイが開始
2. バックエンドがCloud Run（aisha-backend-new）にデプロイ
3. バックエンドのURLを取得
4. フロントエンドがCloud Run（aisha-frontend-new）にデプロイ（バックエンドURLを環境変数として設定）

## 注意事項

1. **秘密情報の管理**
   - 絶対に秘密鍵をコードにハードコーディングしない
   - すべての機密情報はGitHub Secretsで管理
   - 本番環境ではGoogle Secret Managerの使用を推奨

2. **データベース**
   - 本番環境ではCloud SQLまたは外部のマネージドPostgreSQLを使用
   - バックアップ戦略を必ず設定

3. **スケーリング**
   - 現在の設定：最小0インスタンス、最大10インスタンス
   - トラフィックに応じて調整が必要

4. **監視**
   - Cloud Runのメトリクスを定期的に確認
   - エラーログの監視を設定

## トラブルシューティング

### デプロイが失敗する場合
1. GitHub Secretsがすべて設定されているか確認
2. GCPのサービスアカウントに必要な権限があるか確認
3. Cloud Runのクォータを確認

### アプリケーションが起動しない場合
1. Cloud Runのログを確認
2. 環境変数が正しく設定されているか確認
3. データベース接続を確認