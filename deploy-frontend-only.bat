@echo off
echo ===== AISHA Frontend Deployment =====
echo.

cd /d C:\Users\hidet\Documents\AISHA

echo バックエンドURL取得中...
for /f "delims=" %%i in ('gcloud run services describe aisha-backend --region asia-northeast1 --format "value(status.url)"') do set BACKEND_URL=%%i

echo Backend URL: %BACKEND_URL%
echo.

echo 🎨 フロントエンドをCloud Runにデプロイ中...
gcloud run deploy aisha-frontend ^
  --source ./react_project ^
  --platform managed ^
  --region asia-northeast1 ^
  --allow-unauthenticated ^
  --memory 512Mi ^
  --cpu 1 ^
  --min-instances 0 ^
  --max-instances 10 ^
  --set-env-vars VITE_AISHA_API_BASE=%BACKEND_URL%/api ^
  --set-env-vars NODE_ENV=production

echo.
echo ✅ フロントエンドデプロイ完了
echo.
pause
