# デプロイメントガイド

## 🚀 自動デプロイ（推奨）

### GitHub Actionsを使用
```bash
git add .
git commit -m "デプロイ準備完了"
git push origin main
```

GitHub Actionsが自動的に以下を実行：
1. テスト実行
2. ビルド確認  
3. GCPとRenderへの同時デプロイ

## 🔧 手動デプロイ

### Google Cloud Platform
```bash
cd deploy
chmod +x gcp-deploy.sh
./gcp-deploy.sh
```

### Render
```bash
# render.yamlを使用した自動デプロイ
git push origin main  # Renderが自動検知
```

## 📋 必要な設定

### GitHub Secrets（必須）
```
GCP_SA_KEY=<サービスアカウントキーJSON>
DJANGO_SECRET_KEY=<Django秘密鍵>
DATABASE_URL=<本番DB接続URL>
VITE_FIREBASE_API_KEY=<Firebase API Key>
VITE_FIREBASE_AUTH_DOMAIN=<Firebase Auth Domain>
VITE_FIREBASE_PROJECT_ID=<Firebase Project ID>
VITE_STRIPE_PUBLISHABLE_KEY=<Stripe公開キー>
RENDER_API_KEY=<Render APIキー>
RENDER_SERVICE_ID=<RenderサービスID>
```

### 初回セットアップ
1. GCPサービスアカウント作成
2. GitHub Secrets設定
3. Firebase/Stripe設定確認

## 🌐 デプロイ先

### GCP（推奨）
- **プロジェクト**: aisha-462412
- **リージョン**: asia-northeast1
- **コスト**: $23-70/月

### Render（バックアップ）
- **設定**: render.yaml
- **コスト**: $20-40/月

## 🔍 デプロイ後の確認

```bash
# GCP
gcloud run services list --region asia-northeast1

# Render
curl https://your-app.onrender.com/api/health/
```

## 🛠️ トラブルシューティング

### よくある問題
1. **データベース接続エラー**: DATABASE_URL確認
2. **ビルドエラー**: 依存関係の確認
3. **環境変数エラー**: GitHub Secrets設定確認

### ログ確認
```bash
# GCP
gcloud logs read --service aisha-backend --limit 50

# ローカル
docker-compose logs -f
```