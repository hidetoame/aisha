# ⚡ 最小限GitHub Secrets設定（5分で完了）

**AISHAの最小限テストデプロイに必要な設定**

## 🔑 必須4項目（これだけでOK）

### 1. GCP_SA_KEY
```
プロジェクトルートにある service-account.json の内容をそのままコピー
```

### 2. DJANGO_SECRET_KEY  
```bash
# 以下のコマンドで生成してコピー
python -c "import secrets; print('django-insecure-' + secrets.token_urlsafe(32))"
```

### 3. DATABASE_URL
```
postgresql://postgres:postgres@localhost/postgres?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db
```

### 4. POSTGRES_PASSWORD
```
postgres
```

## 🚀 設定手順

### ステップ1: service-account.json 確認
```bash
# プロジェクトルートにあるファイルの内容をコピー
cat service-account.json
```

### ステップ2: Django Secret Key生成
```bash
# WSLで実行
python -c "import secrets; print('django-insecure-' + secrets.token_urlsafe(32))"
```

### ステップ3: GitHub Secrets設定
```
1. GitHub > Settings > Secrets and variables > Actions
2. "New repository secret" クリック
3. 上記4項目を設定
```

### ステップ4: テストデプロイ
```bash
git add .
git commit -m "最小設定テストデプロイ"
git push origin main
```

## 📱 デプロイ後確認
```bash
# GitHub Actions実行状況
https://github.com/[your-username]/[repo-name]/actions

# デプロイ完了後のURL
https://aisha-frontend-[hash].a.run.app
```

## 🔧 後で追加する設定
- Firebase設定（ログイン機能用）
- Stripe設定（決済機能用）  
- Clipdrop設定（画像処理用）

**まずは基本機能をテストしましょう！** 