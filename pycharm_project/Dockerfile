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

# Cloud Run用のポート設定
ENV PORT=8080
EXPOSE 8080

# 直接Gunicornで起動（シンプル版）
CMD ["gunicorn", "django_project.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "2"]
