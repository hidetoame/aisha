# GitHub Secrets 設定ガイド

## 概要
本番環境へのデプロイに必要なGitHub Secretsの設定手順を説明します。

## 設定手順

### 1. GitHubリポジトリの設定画面へアクセス
1. GitHubでAISHAリポジトリを開く
2. Settings → Secrets and variables → Actions を選択
3. "New repository secret" をクリック

### 2. 必要なSecrets

#### 基本設定

**GCP_SA_KEY**
```
説明: Google Cloud Platform サービスアカウントキー
形式: JSON（改行を含む完全なJSON）
取得方法:
1. GCPコンソール → IAMと管理 → サービスアカウント
2. デプロイ用サービスアカウントを選択
3. キー → 新しいキーを追加 → JSONタイプ
必要な権限:
- Cloud Run 管理者
- Cloud SQL クライアント
- Secret Manager アクセサー
- Storage オブジェクト管理者
```

**DJANGO_SECRET_KEY**
```
説明: Django用のシークレットキー
形式: 50文字以上のランダム文字列
生成方法:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**DATABASE_URL**
```
説明: Cloud SQL PostgreSQL接続URL
形式: postgresql://username:password@/dbname?host=/cloudsql/connection-name
例: postgresql://postgres:YOUR_PASSWORD@/aisha_db?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db
注意: 
- パスワードはURL エンコードが必要（特殊文字を含む場合）
- Cloud SQL プロキシ経由での接続
```

#### Stripe設定（本番環境）

**STRIPE_PUBLISHABLE_KEY_LIVE**
```
説明: Stripe本番用公開可能キー
形式: pk_live_で始まる文字列
取得方法: Stripeダッシュボード → 開発者 → APIキー
```

**STRIPE_SECRET_KEY_LIVE**
```
説明: Stripe本番用シークレットキー
形式: sk_live_で始まる文字列
取得方法: Stripeダッシュボード → 開発者 → APIキー
警告: 絶対に公開しないこと
```

**STRIPE_WEBHOOK_SECRET_LIVE**
```
説明: Stripe Webhookエンドポイントのシークレット
形式: whsec_で始まる文字列
取得方法:
1. Stripeダッシュボード → 開発者 → Webhook
2. 本番用エンドポイントを追加
3. エンドポイントのシークレットを確認
```

#### Firebase設定

**VITE_FIREBASE_API_KEY**
```
説明: Firebase APIキー
取得方法: Firebaseコンソール → プロジェクト設定 → 全般
```

**VITE_FIREBASE_AUTH_DOMAIN**
```
説明: Firebase認証ドメイン
形式: your-project.firebaseapp.com
```

**VITE_FIREBASE_PROJECT_ID**
```
説明: FirebaseプロジェクトID
形式: your-project-id
```

**VITE_FIREBASE_STORAGE_BUCKET**
```
説明: Firebase Storageバケット
形式: your-project.appspot.com
注意: Cloud Storageは開発・本番共通で使用
```

**VITE_FIREBASE_MESSAGING_SENDER_ID**
```
説明: Firebase Messaging送信者ID
形式: 数字の文字列
```

**VITE_FIREBASE_APP_ID**
```
説明: Firebase アプリID
形式: 1:xxxxx:web:xxxxx
```

**VITE_FIREBASE_MEASUREMENT_ID**
```
説明: Firebase測定ID（Google Analytics）
形式: G-XXXXXXXXXX
任意: アナリティクスを使用しない場合は不要
```

#### その他のAPI設定

**SUZURI_API_TOKEN**
```
説明: SUZURI APIアクセストークン
取得方法: SUZURIデベロッパーページ → APIトークン
```

**GEMINI_API_KEY**
```
説明: Google Gemini APIキー
取得方法: Google AI Studio → APIキーを取得
```

**VITE_CLIPDROP_API_KEY**
```
説明: ClipDrop APIキー（フロントエンド用）
取得方法: ClipDropダッシュボード → APIキー
```

**CLIPDROP_API_KEY**
```
説明: ClipDrop APIキー（バックエンド用）
取得方法: 同上
```

**GCS_CREDENTIALS_JSON**
```
説明: Google Cloud Storage認証情報
形式: JSON（サービスアカウントキー）
注意: GCP_SA_KEYと同じものを使用可能
```

### 3. Cloud Build用の追加設定

Cloud Buildを使用する場合、以下のSubstitution variablesも設定：

```bash
# GitHub Actionsではなく、Cloud Buildコンソールで設定
_VITE_FIREBASE_API_KEY
_VITE_FIREBASE_AUTH_DOMAIN
_VITE_FIREBASE_PROJECT_ID
_VITE_FIREBASE_STORAGE_BUCKET
_VITE_FIREBASE_MESSAGING_SENDER_ID
_VITE_FIREBASE_APP_ID
_VITE_STRIPE_PUBLISHABLE_KEY
```

## セキュリティのベストプラクティス

1. **最小権限の原則**
   - サービスアカウントには必要最小限の権限のみ付与
   - 定期的に権限を見直し

2. **ローテーション**
   - APIキーとシークレットは定期的に更新
   - 特にDJANGO_SECRET_KEYは年1回以上更新推奨

3. **アクセス制限**
   - GitHub Secretsへのアクセスは管理者のみに制限
   - 監査ログを有効化

4. **バックアップ**
   - シークレットのバックアップは暗号化して別途保管
   - 災害復旧計画に含める

## トラブルシューティング

### よくあるエラー

1. **Invalid JSON format**
   - JSONキーの改行やスペースが正しくコピーされているか確認
   - JSONバリデーターで検証

2. **Permission denied**
   - サービスアカウントの権限を確認
   - プロジェクトIDが正しいか確認

3. **Database connection failed**
   - DATABASE_URLのフォーマットを確認
   - Cloud SQL APIが有効か確認
   - Cloud SQL Admin APIが有効か確認

## 設定確認チェックリスト

- [ ] すべての必須Secretsが設定されている
- [ ] JSON形式のSecretsが正しくパースできる
- [ ] 本番用のAPIキーを使用している（_test_や_dev_でないこと）
- [ ] データベースのパスワードが強力である
- [ ] Secretsの名前が正確である（大文字小文字も含む）

## 次のステップ

1. すべてのSecretsを設定後、テストデプロイを実行
2. Cloud Runのログを確認して接続エラーがないか確認
3. 本番環境でのE2Eテストを実施