#!/bin/bash
# Cloud SQL監査ログを有効化するスクリプト

echo "🔍 Cloud SQL監査ログを有効化します..."

# データベースフラグを設定して監査ログを有効化
gcloud sql instances patch aisha-db \
  --database-flags=cloudsql.enable_pgaudit=on,pgaudit.log='DDL' \
  --project=aisha-462412

echo "✅ 監査ログが有効になりました"
echo ""
echo "📝 これで以下の情報が記録されます："
echo "  - DROP DATABASE実行者のIPアドレス"
echo "  - 実行時刻（詳細）"
echo "  - 使用されたユーザー名"
echo "  - 実行されたSQL文の詳細"