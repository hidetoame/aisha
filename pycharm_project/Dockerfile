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

# 使用するポート（例：8000）
EXPOSE 8000

# Gunicornでアプリを起動（プロジェクト名やwsgiパスは実際のものに合わせる）
# docker-compose.ymlで上書きされなかった時のデフォルト（本番環境用コマンド）
CMD ["gunicorn", "django_project.wsgi:application", "--bind", "0.0.0.0:8000"]
