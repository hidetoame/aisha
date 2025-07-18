# AISHA デプロイメント自動化ガイド

## 概要
AISHAプロジェクトのデプロイメントシステムには、**自動データベースマイグレーション機能**が組み込まれています。

## 🚀 デプロイ方法

### 1. クイックデプロイ（推奨）
```bash
# Linux/Mac用
./deploy-quick.sh

# Windows用
deploy-quick.bat
```

### 2. 手動GCPデプロイ
```bash
cd deploy
./gcp-deploy.sh
```

### 3. GitHub Actions（自動）
```bash
git add .
git commit -m "コミットメッセージ"
git push origin main
```

## 🔄 自動マイグレーション機能

### 動作概要
すべてのデプロイメント方法で以下の処理が自動実行されます：

1. **バックエンドデプロイ** → Cloud Runにアプリケーションをデプロイ
2. **マイグレーション状況チェック** → `/api/admin/migrate/status/` で未適用マイグレーションを確認
3. **自動マイグレーション実行** → 未適用がある場合 `/api/admin/migrate/` を実行
4. **フロントエンドデプロイ** → 完了後にフロントエンドをデプロイ

### ログ出力例
```
🔄 データベースマイグレーションチェック・適用...
マイグレーション状況確認中...
現在のマイグレーション状況を確認しました。
🔄 未適用のマイグレーションが検出されました。自動適用中...
✅ データベースマイグレーション完了
📋 適用内容:
  Applying api.0016_new_feature... OK (0.068s)
```

## 📋 マイグレーション管理

### 新しいマイグレーション作成
```bash
cd pycharm_project
python manage.py makemigrations
```

### 手動マイグレーション確認
```bash
# 本番環境の状況確認
curl -X GET https://aisha-backend-584412696241.asia-northeast1.run.app/api/admin/migrate/status/

# 手動マイグレーション実行
curl -X POST https://aisha-backend-584412696241.asia-northeast1.run.app/api/admin/migrate/ \
  -H "Content-Type: application/json" -d "{}"
```

## 🔒 セキュリティ機能

### マイグレーションエンドポイント制限
- マイグレーションAPIは**本番環境（DEBUG=False）でのみ**利用可能
- 開発環境では403エラーを返してアクセスを拒否
- 認証不要だが、本番環境限定で安全性を確保

### 対象エンドポイント
- `POST /api/admin/migrate/` - マイグレーション実行
- `GET /api/admin/migrate/status/` - マイグレーション状況確認

## ⚠️ 注意事項

### デプロイ前の準備
1. **マイグレーションファイル作成**: `python manage.py makemigrations`
2. **ローカル確認**: `python manage.py migrate` でローカル実行確認
3. **テスト実行**: 必要に応じてテストを実行

### エラー対応
- マイグレーション失敗時はデプロイが停止します
- GitHub Actionsの場合、`exit 1` でワークフローが失敗
- 手動スクリプトの場合、エラーメッセージが表示されます

### マイグレーション失敗時の対処
1. **ログ確認**: エラー詳細を確認
2. **手動修正**: 必要に応じてマイグレーションファイルを修正
3. **再デプロイ**: 修正後に再度デプロイ実行

## 🎯 今後の運用

### データベース変更フロー
1. **モデル変更** → `models.py` を編集
2. **マイグレーション作成** → `python manage.py makemigrations`
3. **デプロイ実行** → 自動的にマイグレーションが適用
4. **確認** → ログでマイグレーション完了を確認

### モニタリング
- デプロイ時のマイグレーションログを確認
- Cloud Run のログでアプリケーションの動作確認
- 必要に応じて手動でマイグレーション状況を確認

## 📞 トラブルシューティング

### よくある問題
1. **マイグレーション競合**: 複数の開発者が同時にマイグレーション作成
2. **データ型変更**: 既存データとの互換性問題
3. **外部キー制約**: 関連するテーブルとの整合性問題

### 解決方法
1. **競合解決**: `python manage.py makemigrations --merge`
2. **データ変換**: カスタムマイグレーションでデータ変換
3. **段階的移行**: 複数回に分けてマイグレーション実行

## 🔧 設定ファイル

### 関連ファイル
- `deploy/gcp-deploy.sh` - GCPデプロイスクリプト
- `deploy-quick.sh` - クイックデプロイスクリプト
- `.github/workflows/deploy.yml` - GitHub Actionsワークフロー
- `api/views/migrate_endpoint.py` - マイグレーションAPI
- `api/urls.py` - マイグレーションエンドポイント設定

これで、今後のデプロイ時に自動的にデータベースマイグレーションがチェック・適用されます。