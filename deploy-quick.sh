#!/bin/bash
# 統合デプロイスクリプト（Linux/Mac用）

set -e

echo "🚀 AISHA デプロイメント開始..."

# 現在のブランチ確認
CURRENT_BRANCH=$(git branch --show-current)
echo "現在のブランチ: $CURRENT_BRANCH"

echo ""
echo "📋 デプロイ先を選択してください:"
echo "1. GitHub Actions（自動デプロイ）"
echo "2. GCP（手動デプロイ）"
echo "3. 全て（順次実行）"

read -p "選択 (1-3): " choice

case $choice in
    1)
        echo "🔄 GitHub Actionsデプロイ..."
        git add .
        git status
        read -p "コミットメッセージ: " commit_msg
        git commit -m "$commit_msg"
        git push origin main
        echo "✅ GitHub Actionsが自動実行されます"
        echo "進捗確認: https://github.com/hidetoame/aisha/actions"
        ;;
    2)
        echo "🔧 GCP デプロイ..."
        cd deploy
        chmod +x gcp-deploy.sh
        ./gcp-deploy.sh
        cd ..
        ;;
    3)
        echo "🚀 全プラットフォームデプロイ..."
        echo ""
        echo "1. GitHub Actions（自動テスト＋デプロイ）"
        git add .
        read -p "コミットメッセージ: " commit_msg
        git commit -m "$commit_msg"
        git push origin main
        echo ""
        echo "2. GCP（手動デプロイ）"
        cd deploy
        chmod +x gcp-deploy.sh
        ./gcp-deploy.sh
        cd ..
        echo ""
        echo "✅ 全デプロイ完了"
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac

echo ""
echo "🎉 デプロイ完了！"
echo ""
echo "📍 確認URL:"
echo "- GitHub Actions: https://github.com/hidetoame/aisha/actions"
echo "- GCP Frontend: https://aisha-frontend-[hash].a.run.app"
echo "- GCP Backend: https://aisha-backend-[hash].a.run.app"
echo ""