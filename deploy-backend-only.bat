@echo off
echo ===== AISHA Backend Deployment =====
echo.

cd /d C:\Users\hidet\Documents\AISHA

echo 🔧 バックエンドをCloud Runにデプロイ中...
gcloud config set project aisha-462412

gcloud run deploy aisha-backend ^
  --source ./pycharm_project ^
  --platform managed ^
  --region asia-northeast1 ^
  --allow-unauthenticated ^
  --memory 1Gi ^
  --cpu 1 ^
  --min-instances 0 ^
  --max-instances 10 ^
  --set-env-vars DEBUG=False ^
  --set-env-vars ALLOWED_HOSTS=*.run.app

echo.
echo ✅ バックエンドデプロイ完了
echo.
pause
