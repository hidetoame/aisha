#!/bin/bash
# Django マイグレーション実行スクリプト

echo "🔄 Django マイグレーション実行中..."

# Cloud Run Jobs を使用してマイグレーションを実行
gcloud run jobs create aisha-migration \
  --image gcr.io/aisha-462412/aisha-backend:latest \
  --region asia-northeast1 \
  --task-timeout 600 \
  --max-retries 3 \
  --parallelism 1 \
  --args="python,manage.py,migrate" \
  --set-env-vars DATABASE_URL="postgresql://aisha_user:AishaProd2024!@/aisha_prod?host=/cloudsql/aisha-462412:asia-northeast1:aisha-db" \
  --set-env-vars DJANGO_SECRET_KEY="M0Tj6Kkaxry+0zS8SmnrSjuryUVn7rR+Ts04O4jdj0w=" \
  --set-env-vars DEBUG=False \
  --set-env-vars ALLOWED_HOSTS="*" \
  --set-env-vars TSUKURUMA_API_HOST=localhost \
  --set-env-vars TSUKURUMA_API_PORT=8000 \
  --set-env-vars APP_NAME=AISHA \
  --set-env-vars ENV_FILE=.env.prod \
  --set-cloudsql-instances aisha-462412:asia-northeast1:aisha-db

echo "✅ マイグレーションジョブ作成完了"
echo "実行: gcloud run jobs execute aisha-migration --region asia-northeast1"