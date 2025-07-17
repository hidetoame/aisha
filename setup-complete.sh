#!/bin/bash

# dnd-kit パッケージをインストール
echo "Installing dnd-kit packages..."
cd "C:/Users/hidet/Documents/AISHA/react_project"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# マイグレーションを実行
echo "Running Django migrations..."
cd "C:/Users/hidet/Documents/AISHA/pycharm_project"
python manage.py migrate

# Dockerコンテナを起動
echo "Starting Docker containers..."
cd "C:/Users/hidet/Documents/AISHA"
docker-compose up -d

echo "Setup complete!"
