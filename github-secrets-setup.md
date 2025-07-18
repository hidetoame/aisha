# 🔐 GitHub Secrets セットアップガイド

**新しいGitHub Actions用の環境変数設定**

## 📋 必要なSecrets一覧

### 🔑 必須（最優先）
```bash
# GCP認証
GCP_SA_KEY="<service-account.jsonの内容をそのままコピー>"

# Django Core
DJANGO_SECRET_KEY="<強力な32文字以上のランダム文字列>"
DATABASE_URL="postgresql://aisha_user:PASSWORD@localhost/aisha_prod?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db"

# DB認証
POSTGRES_PASSWORD="<本番DB用の強力なパスワード>"
```

### 🔥 Firebase（ローカルと同じ値）
```bash
VITE_FIREBASE_API_KEY="AIzaSyAMj_nLlzlwYurQNO-EH0lSGZjlj8BztOI"
VITE_FIREBASE_AUTH_DOMAIN="aisha-f9c6c.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="aisha-f9c6c"
VITE_FIREBASE_STORAGE_BUCKET="aisha-f9c6c.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="139166899282"
VITE_FIREBASE_APP_ID="1:139166899282:web:7dc281d297b92b18a8938b"
VITE_FIREBASE_MEASUREMENT_ID="G-PEKY2T7RXG"
```

### 💳 Stripe（本番用に要変更）
```bash
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_..." # 本番用公開キー
STRIPE_SECRET_KEY="sk_live_..." # 本番用秘密キー
```

### 🎨 その他（ローカルと同じ）
```bash
VITE_CLIPDROP_API_KEY="d373abfd094c1e0f5ab23f8edc155e2e689bad2ba77c2f9facc1312e18da9ad51bb229e3e91a78bac2f9f60b396c909d"
GCS_CREDENTIALS_JSON="<GCS認証JSON文字列>"
```

## 🚀 設定手順

### 1. GitHubリポジトリでSecrets設定
```
1. GitHub > Settings > Secrets and variables > Actions
2. "New repository secret" をクリック
3. 上記の各項目を設定
```

### 2. 緊急用最小設定（5分で完了）
最低限これだけ設定すれば動作します：
```bash
GCP_SA_KEY="<service-account.jsonの内容>"
DJANGO_SECRET_KEY="django-insecure-$(openssl rand -base64 32)"
DATABASE_URL="postgresql://postgres:postgres@localhost/postgres?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db"
POSTGRES_PASSWORD="postgres"
```

### 3. テストデプロイ
```bash
git add .
git commit -m "新しいGitHub Actions設定"
git push origin main
```

## 🔧 service-account.json 取得方法

### GCP Console から取得：
```
1. GCP Console > IAM & Admin > Service Accounts
2. aisha-backend@aisha-462412.iam.gserviceaccount.com を選択
3. Keys タブ > ADD KEY > Create new key > JSON
4. ダウンロードしたJSONファイルの内容をコピー
```

## ⚡ クイック設定コマンド
```bash
# Django Secret Key 生成
python -c "import secrets; print('django-insecure-' + secrets.token_urlsafe(32))"

# ランダムパスワード生成
openssl rand -base64 32
```

## 📱 設定確認方法
```bash
# GitHub Actions実行後
curl https://aisha-frontend-[hash].a.run.app/
curl https://aisha-backend-[hash].a.run.app/api/
``` 