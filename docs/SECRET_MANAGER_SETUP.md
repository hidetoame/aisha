# Google Secret Manager セットアップガイド

## 概要
GitHub ActionsからGoogle Secret Managerを使用するための設定手順です。

## 1. Secret Managerの有効化

```bash
# Secret Manager APIを有効化
gcloud services enable secretmanager.googleapis.com --project=aisha-462412
```

## 2. シークレットの作成

### コマンドラインでの作成

```bash
# Django Secret Key
echo -n "your-django-secret-key" | gcloud secrets create DJANGO_SECRET_KEY \
    --replication-policy="automatic" \
    --data-file=-

# Database URL
echo -n "postgresql://user:pass@/dbname?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db" | \
    gcloud secrets create DATABASE_URL \
    --replication-policy="automatic" \
    --data-file=-

# Stripe Secret Key
echo -n "sk_live_xxxxx" | gcloud secrets create STRIPE_SECRET_KEY_LIVE \
    --replication-policy="automatic" \
    --data-file=-

# その他のシークレットも同様に作成
```

### GCPコンソールでの作成

1. [Secret Manager](https://console.cloud.google.com/security/secret-manager)にアクセス
2. 「シークレットを作成」をクリック
3. 名前とシークレット値を入力
4. レプリケーションポリシーは「自動」を選択

## 3. サービスアカウントの権限設定

```bash
# サービスアカウントのメールを確認
SERVICE_ACCOUNT_EMAIL="your-service-account@aisha-462412.iam.gserviceaccount.com"

# Secret Manager アクセサー権限を付与
gcloud projects add-iam-policy-binding aisha-462412 \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
```

## 4. 必要なシークレット一覧

| シークレット名 | 説明 | 形式 |
|--------------|------|------|
| DJANGO_SECRET_KEY | Djangoシークレットキー | 50文字以上のランダム文字列 |
| DATABASE_URL | Cloud SQL接続文字列 | postgresql://... |
| STRIPE_SECRET_KEY_LIVE | Stripe本番シークレットキー | sk_live_... |
| STRIPE_WEBHOOK_SECRET_LIVE | Stripe Webhookシークレット | whsec_... |
| SUZURI_API_TOKEN | SUZURI APIトークン | Bearer token |
| GEMINI_API_KEY | Gemini APIキー | AIza... |
| CLIPDROP_API_KEY | ClipDrop APIキー | API key |
| GCS_CREDENTIALS_JSON | GCSサービスアカウントJSON | JSON形式 |

## 5. Cloud Runでの使用

Cloud Runサービスは自動的にSecret Managerから値を取得します：

```yaml
--set-secrets="DATABASE_URL=DATABASE_URL:latest"
```

## 6. ローカル開発での確認

```bash
# シークレットの値を確認（開発時のみ）
gcloud secrets versions access latest --secret="DJANGO_SECRET_KEY"

# シークレットの一覧
gcloud secrets list

# シークレットのバージョン履歴
gcloud secrets versions list DJANGO_SECRET_KEY
```

## 7. セキュリティのベストプラクティス

1. **アクセス制御**
   - 必要最小限のサービスアカウントのみにアクセス権限を付与
   - 定期的にアクセスログを確認

2. **ローテーション**
   - 定期的にシークレットを更新
   - 古いバージョンは無効化

3. **監査**
   - Cloud Loggingで監査ログを有効化
   - 不正なアクセスを検知

```bash
# 監査ログの確認
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" \
    --limit 50 \
    --format json
```

## トラブルシューティング

### Permission Deniedエラー
- サービスアカウントの権限を確認
- Secret Manager APIが有効か確認

### シークレットが見つからない
- シークレット名が正確か確認（大文字小文字も含む）
- プロジェクトIDが正しいか確認

### Cloud Runでシークレットが読み込めない
- Cloud RunサービスアカウントにSecret Managerアクセス権限があるか確認
- シークレットのバージョンが存在するか確認