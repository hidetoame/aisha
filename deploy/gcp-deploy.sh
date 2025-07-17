#!/bin/bash
# Google Cloud Platform デプロイメント設定

set -e  # エラーで停止

PROJECT_ID="aisha-462412"
REGION="asia-northeast1"

echo "🚀 GCP デプロイメント開始..."

# プロジェクト設定
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
echo "📋 必要なAPIを有効化..."
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Cloud SQL データベース作成 (存在しない場合のみ)
echo "🗄️ データベースセットアップ..."
if ! gcloud sql instances describe aisha-db --region=$REGION >/dev/null 2>&1; then
    echo "データベースインスタンスを作成中..."
    gcloud sql instances create aisha-db \
      --database-version=POSTGRES_15 \
      --region=$REGION \
      --tier=db-f1-micro \
      --storage-size=10GB \
      --storage-type=SSD \
      --availability-type=zonal
    
    # データベース作成
    gcloud sql databases create aisha_prod --instance=aisha-db
    
    echo "データベースユーザー作成..."
    gcloud sql users create aisha_user --instance=aisha-db --password=$(openssl rand -base64 32)
else
    echo "データベースインスタンス既に存在"
fi

# データベース接続情報取得
DB_CONNECTION=$(gcloud sql instances describe aisha-db --format="value(connectionName)")
DB_PASSWORD=$(gcloud sql users describe aisha_user --instance=aisha-db --format="value(password)" 2>/dev/null || echo "")

echo "🔧 バックエンドデプロイ..."
gcloud run deploy aisha-backend \
  --source ./pycharm_project \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --add-cloudsql-instances $DB_CONNECTION \
  --set-env-vars DEBUG=False \
  --set-env-vars ALLOWED_HOSTS=*.run.app \
  --set-env-vars DATABASE_URL=postgresql://aisha_user:$DB_PASSWORD@localhost/aisha_prod?host=/cloudsql/$DB_CONNECTION

# バックエンドURL取得
BACKEND_URL=$(gcloud run services describe aisha-backend --region $REGION --format 'value(status.url)')
echo "✅ バックエンドURL: $BACKEND_URL"

echo "🎨 フロントエンドデプロイ..."
gcloud run deploy aisha-frontend \
  --source ./react_project \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars VITE_AISHA_API_BASE=$BACKEND_URL/api \
  --set-env-vars NODE_ENV=production

# フロントエンドURL取得
FRONTEND_URL=$(gcloud run services describe aisha-frontend --region $REGION --format 'value(status.url)')

echo "🎉 デプロイ完了!"
echo "フロントエンド: $FRONTEND_URL"
echo "バックエンド: $BACKEND_URL"

# 概算コスト (月額):
# - Cloud Run Frontend: $5-15
# - Cloud Run Backend: $10-30
# - Cloud SQL: $7-20
# - Cloud Storage: $1-5
# 合計: $23-70/月
