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

# 開発用のポート設定
EXPOSE 8000

# 開発用の起動コマンド（docker-compose.ymlで上書きされる）
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
