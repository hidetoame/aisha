@echo off
echo ===== AISHA Complete Deployment with Debug =====
echo.

cd /d C:\Users\hidet\Documents\AISHA

echo 🚀 GCP デプロイメント開始...
echo.

REM プロジェクト設定
gcloud config set project aisha-462412

echo 📋 必要なAPIを有効化...
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com

echo.
echo 🔧 バックエンドデプロイ中...
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

if %ERRORLEVEL% neq 0 (
    echo ❌ バックエンドデプロイでエラーが発生しました
    echo エラーレベル: %ERRORLEVEL%
    pause
    exit /b 1
)

echo ✅ バックエンドデプロイ完了

REM バックエンドURL取得
for /f "delims=" %%i in ('gcloud run services describe aisha-backend --region asia-northeast1 --format "value(status.url)"') do set BACKEND_URL=%%i

echo Backend URL: %BACKEND_URL%
echo.

echo 🔄 データベースマイグレーションチェック...
curl -X GET "%BACKEND_URL%/api/admin/migrate/status/" 2>nul

echo.
echo 🎨 フロントエンドデプロイ中...
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

if %ERRORLEVEL% neq 0 (
    echo ❌ フロントエンドデプロイでエラーが発生しました
    echo エラーレベル: %ERRORLEVEL%
    pause
    exit /b 1
)

REM フロントエンドURL取得
for /f "delims=" %%i in ('gcloud run services describe aisha-frontend --region asia-northeast1 --format "value(status.url)"') do set FRONTEND_URL=%%i

echo.
echo 🎉 デプロイ完了!
echo フロントエンド: %FRONTEND_URL%
echo バックエンド: %BACKEND_URL%
echo.
pause
