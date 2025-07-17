@echo off
REM 統合デプロイスクリプト（Windows用）
echo 🚀 AISHA デプロイメント開始...

REM 現在のブランチ確認
git branch --show-current
if not "%errorlevel%"=="0" (
    echo ❌ Gitリポジトリではありません
    pause
    exit /b 1
)

echo.
echo 📋 デプロイ先を選択してください:
echo 1. GitHub Actions（自動デプロイ）
echo 2. GCP（手動デプロイ）
echo 3. Render（手動デプロイ）
echo 4. 全て（順次実行）

set /p choice="選択 (1-4): "

if "%choice%"=="1" goto github_deploy
if "%choice%"=="2" goto gcp_deploy
if "%choice%"=="3" goto render_deploy
if "%choice%"=="4" goto all_deploy

echo ❌ 無効な選択です
pause
exit /b 1

:github_deploy
echo 🔄 GitHub Actionsデプロイ...
git add .
git status
echo.
set /p commit_msg="コミットメッセージ: "
git commit -m "%commit_msg%"
git push origin main
echo ✅ GitHub Actionsが自動実行されます
echo 進捗確認: https://github.com/hidetoame/aisha/actions
goto end

:gcp_deploy
echo 🔧 GCP デプロイ...
cd deploy
call gcp-deploy.sh
cd ..
goto end

:render_deploy
echo 🌐 Render デプロイ...
echo GitHub経由でRenderへプッシュ...
git add .
git commit -m "Render deploy"
git push origin main
echo ✅ Renderが自動デプロイを開始します
goto end

:all_deploy
echo 🚀 全プラットフォームデプロイ...
echo.
echo 1. GitHub Actions（自動テスト＋デプロイ）
git add .
set /p commit_msg="コミットメッセージ: "
git commit -m "%commit_msg%"
git push origin main
echo.
echo 2. GCP（手動デプロイ）
cd deploy
call gcp-deploy.sh
cd ..
echo.
echo ✅ 全デプロイ完了
goto end

:end
echo.
echo 🎉 デプロイ完了！
echo.
echo 📍 確認URL:
echo - GitHub Actions: https://github.com/hidetoame/aisha/actions
echo - GCP Frontend: https://aisha-frontend-[hash].a.run.app
echo - GCP Backend: https://aisha-backend-[hash].a.run.app
echo - Render: https://aisha-frontend.onrender.com
echo.
pause