# 🚀 AISHA デプロイメント完全ガイド

## 🎯 クイックスタート

### 最速デプロイ（推奨）
```bash
# Windows
deploy-quick.bat

# Linux/Mac
chmod +x deploy-quick.sh
./deploy-quick.sh
```

### GitHub Actionsでの自動デプロイ
```bash
git add .
git commit -m "本番デプロイ"
git push origin main
```

## 🏗️ 構成

### 開発環境（変更なし）
```bash
docker-compose up    # localhost:5173 (React)
                    # localhost:7999 (Django)
                    # localhost:4000 (Mock)
```

### 本番環境
- **GCP**: asia-northeast1 ($23-70/月)
- **Render**: バックアップ ($20-40/月)
- **GitHub Actions**: 自動CI/CD

## 📋 初回セットアップ

### 1. GitHub Secrets設定
```
GCP_SA_KEY=<GCPサービスアカウントキー>
DJANGO_SECRET_KEY=<Django秘密鍵>
DATABASE_URL=<本番DB接続URL>
VITE_FIREBASE_API_KEY=<Firebase APIキー>
VITE_FIREBASE_AUTH_DOMAIN=<Firebase認証ドメイン>
VITE_FIREBASE_PROJECT_ID=<FirebaseプロジェクトID>
VITE_STRIPE_PUBLISHABLE_KEY=<Stripe公開キー>
RENDER_API_KEY=<Render APIキー>
RENDER_SERVICE_ID=<RenderサービスID>
```

### 2. GCP初期設定
```bash
# 認証
gcloud auth login
gcloud config set project aisha-462412

# 必要なAPI有効化
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

## 🔄 デプロイ方法

### Method 1: GitHub Actions（推奨）
```bash
git push origin main
```
- 自動テスト実行
- GCP + Render同時デプロイ
- 失敗時の自動ロールバック

### Method 2: GCP直接デプロイ
```bash
cd deploy
./gcp-deploy.sh
```

### Method 3: Render（バックアップ）
```bash
git push origin main  # 自動検知
```

## 📊 デプロイ後の確認

### URL確認
- **Frontend**: https://aisha-frontend-[hash].a.run.app
- **Backend**: https://aisha-backend-[hash].a.run.app
- **API Health**: https://aisha-backend-[hash].a.run.app/api/health/

### ログ確認
```bash
# GCP
gcloud logs read --service aisha-backend --limit 50

# Render
curl https://api.render.com/v1/services/[SERVICE_ID]/logs
```

## 🛠️ トラブルシューティング

### よくある問題

1. **ビルドエラー**
   ```bash
   # 依存関係確認
   cd react_project && npm install
   cd pycharm_project && pip install -r requirements.txt
   ```

2. **データベース接続エラー**
   ```bash
   # 接続確認
   gcloud sql instances describe aisha-db
   ```

3. **環境変数エラー**
   ```bash
   # GitHub Secrets確認
   gh secret list
   ```

### 緊急時の対応

1. **ロールバック**
   ```bash
   # 前のバージョンに戻す
   gcloud run services update aisha-backend --revision=[REVISION_ID]
   ```

2. **サービス停止**
   ```bash
   # トラフィック0に設定
   gcloud run services update aisha-backend --no-traffic
   ```

## 💰 コスト管理

### GCP予算アラート
- 月額$50で警告
- 月額$100で通知

### 最適化のポイント
- min-instances: 0（コールドスタート許可）
- 適切なメモリ設定
- 不要なサービスの停止

## 🔐 セキュリティ

### 環境変数管理
- 機密情報はGitHub Secretsのみ
- 本番・開発環境の分離
- 定期的なキーローテーション

### アクセス制御
- GCPサービスアカウントの最小権限
- CORS設定の確認
- HTTPS強制

## 📈 監視とメンテナンス

### 監視項目
- レスポンス時間
- エラー率
- CPU/メモリ使用量
- データベース接続

### 定期メンテナンス
- 依存関係の更新
- セキュリティパッチ適用
- ログの定期削除

---

**🎉 これで本番環境への完全自動デプロイが可能です！**