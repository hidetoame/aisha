#!/bin/bash

echo "🔥 Firebase認証付きで本番環境にデプロイします..."

cd /mnt/c/Users/hidet/Documents/AISHA/pycharm_project

# Dockerfileでservice-account.jsonをコピーするように更新
cat > Dockerfile.firebase << 'EOF'
# Python公式イメージをベースにする
FROM python:3.11

# 不要なpycファイルの生成を防止
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係のコピーとインストール
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# アプリケーションの全ファイルをコピー
COPY . /app/

# Firebase認証ファイルをコピー
COPY service-account.json /app/service-account.json

# Cloud Run用のポート設定
ENV PORT=8080
EXPOSE 8080

# 直接Gunicornで起動（シンプル版）
CMD ["gunicorn", "django_project.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "2"]
EOF

# Firebase認証ファイル付きでデプロイ
gcloud run deploy aisha-backend \
  --source . \
  --platform managed \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars-file=../env-vars.yaml \
  --set-cloudsql-instances=aisha-462412:asia-northeast1:aisha-db \
  --dockerfile=Dockerfile.firebase

echo "✅ Firebase認証付きデプロイ完了"