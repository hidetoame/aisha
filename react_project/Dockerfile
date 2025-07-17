FROM node:20 AS base

WORKDIR /app

# 依存関係のみ先にコピーしてインストール
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# アプリ全体を上書き（ただし node_modules は除外されている）
COPY . .

# 各ステージはdocker-compose.ymlのbuild.targetから呼び出す
ARG AISHA_API_BASE
ENV AISHA_API_BASE=$AISHA_API_BASE
ARG MOCK_API_BASE
ENV MOCK_API_BASE=$MOCK_API_BASE

# 開発用ステージ（npm run dev用）
FROM base AS dev
CMD ["npm", "run", "dev"]

# buildステージ（本番ビルド）
FROM base AS build
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN npm run build

# prodステージ（nginx配信）
FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV PORT=8080
EXPOSE $PORT
CMD ["/entrypoint.sh"]
