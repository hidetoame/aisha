FROM node:18

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# ポート4000を公開
EXPOSE 4000

# アプリケーションを起動
CMD ["npm", "start"]
