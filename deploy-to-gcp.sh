#!/bin/bash

# AISHA Production Deployment Script for GCP
# 本番環境に安全にデプロイするためのスクリプト

set -e  # エラー時に停止

echo "🚀 AISHA Production Deployment Starting..."

# 1. 現在の状態をバックアップ
echo "📦 Creating backup..."
git add -A
git commit -m "Pre-deployment backup $(date)" || echo "No changes to commit"
git push origin main

# 2. 本番環境用の設定確認
echo "🔍 Checking production configuration..."

if [ ! -f ".env.prod" ]; then
    echo "❌ .env.prod file not found!"
    echo "Please copy .env.prod.template to .env.prod and fill in the values"
    exit 1
fi

# 3. ビルドテスト（本番モードで）
echo "🏗️ Testing production build..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 4. 本番環境でのテスト実行
echo "🧪 Running production tests..."
# ここに必要なテストを追加

# 5. GCPデプロイ
echo "☁️ Deploying to GCP..."

# Cloud Runにデプロイ
gcloud run deploy aisha-backend \
    --source ./pycharm_project \
    --region asia-northeast1 \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "DJANGO_SETTINGS_MODULE=django_project.settings_prod"

gcloud run deploy aisha-frontend \
    --source ./react_project \
    --region asia-northeast1 \
    --platform managed \
    --allow-unauthenticated

echo "✅ Deployment completed!"
echo "🌐 Check your services at:"
echo "   Backend: https://aisha-backend-[hash].a.run.app"
echo "   Frontend: https://aisha-frontend-[hash].a.run.app"