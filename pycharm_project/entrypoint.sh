#!/bin/bash

# Django準備（エラーを無視して続行）
python manage.py collectstatic --noinput || echo "collectstatic failed, continuing..."

# Gunicornでサーバー起動（Cloud Run用ポート設定）
exec gunicorn django_project.wsgi:application \
    --bind 0.0.0.0:${PORT:-8080} \
    --workers 3 \
    --timeout 120 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 100