# 🚀 AISHA 本番環境設定ガイド

**ローカル環境を参考にした正解設定**

## 📋 確認済みローカル設定（現在動作中）

### Django Backend
```
DEBUG=True → False (本番では無効化)
DJANGO_SECRET_KEY=設定済み → 本番用に変更必要
POSTGRES_DB=dev_db → aisha_prod
POSTGRES_USER=dev_user → aisha_user
POSTGRES_HOST=db → /cloudsql/aisha-462412:asia-northeast1:aisha-db
```

### React Frontend  
```
VITE_AISHA_API_BASE=http://localhost:7999/api → https://[backend-url]/api
Firebase設定=完全設定済み → そのまま使用可能
```

## 🎯 本番環境用設定

### 1. GitHub Secrets（必須）
```bash
# Django Core
DJANGO_SECRET_KEY="<32文字以上のランダム文字列>"
DATABASE_URL="postgresql://aisha_user:PASSWORD@localhost/aisha_prod?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db"

# Firebase（ローカルと同じ）
VITE_FIREBASE_API_KEY="AIzaSyAMj_nLlzlwYurQNO-EH0lSGZjlj8BztOI"
VITE_FIREBASE_AUTH_DOMAIN="aisha-f9c6c.firebaseapp.com"  
VITE_FIREBASE_PROJECT_ID="aisha-f9c6c"
VITE_FIREBASE_STORAGE_BUCKET="aisha-f9c6c.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="139166899282"
VITE_FIREBASE_APP_ID="1:139166899282:web:7dc281d297b92b18a8938b"
VITE_FIREBASE_MEASUREMENT_ID="G-PEKY2T7RXG"

# Stripe（本番用キーに要変更）
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# GCP認証
GCP_SA_KEY="<service-account.jsonの内容>"
```

### 2. 簡単デプロイ手順

#### 方法A: GitHub Actions（推奨）
```bash
# 1. GitHub Secretsを設定（上記参照）
# 2. コードをプッシュ
git add .
git commit -m "本番デプロイ準備"
git push origin main
```

#### 方法B: 手動デプロイ
```bash
# シンプルなデプロイスクリプトを使用
chmod +x deploy/gcp-deploy.sh
./deploy/gcp-deploy.sh
```

## 🔧 設定ファイル整理（優先度順）

### 使用する設定：
1. `docker-compose.yml` - ローカル開発（現在完璧）
2. `.github/workflows/production.yml` - 自動デプロイ
3. `deploy/gcp-deploy.sh` - 手動デプロイ

### 削除/無視する設定：
- `docker-compose.prod.yml` - 混乱の元
- `settings_prod.py` - 不要（settings.pyで統一）
- `env-vars.yaml` - 古い設定

## ⚡ 緊急デプロイ（5分で完了）

現在のローカル設定をそのまま使える最速方法：

```bash
# 1. GitHub Secretsに必要最小限を設定
DJANGO_SECRET_KEY="django-insecure-強化版-$(openssl rand -base64 32)"
DATABASE_URL="postgresql://postgres:postgres@localhost/postgres?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db"

# 2. プッシュするだけ
git push origin main
```

## 🎉 次のステップ

1. **どの方法でデプロイしますか？**
   - A) GitHub Actions（自動）
   - B) 手動デプロイ
   
2. **設定整理しますか？**
   - 不要なファイルの削除
   - 設定の統一化 