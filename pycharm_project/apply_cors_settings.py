#!/usr/bin/env python
"""Google Cloud Storage CORS設定適用スクリプト"""

import os
import sys
import django
import json
from google.cloud import storage
from google.oauth2 import service_account

# Djangoプロジェクトのパスを追加
sys.path.append('/app')

# Django設定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from django.conf import settings

def apply_cors_settings():
    """GCSバケットにCORS設定を適用"""
    try:
        # 認証情報の取得
        credentials = None
        google_app_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        
        if google_app_creds and os.path.exists(google_app_creds):
            print(f"✅ 認証ファイル使用: {google_app_creds}")
            credentials = service_account.Credentials.from_service_account_file(google_app_creds)
        elif hasattr(settings, 'GCS_CREDENTIALS_JSON') and settings.GCS_CREDENTIALS_JSON:
            print("✅ Django設定から認証情報を取得")
            if settings.GCS_CREDENTIALS_JSON.startswith('{'):
                credentials_info = json.loads(settings.GCS_CREDENTIALS_JSON)
                credentials = service_account.Credentials.from_service_account_info(credentials_info)
            else:
                credentials = service_account.Credentials.from_service_account_file(settings.GCS_CREDENTIALS_JSON)
        else:
            print("❌ 認証情報が見つかりません")
            return False

        # GCSクライアント作成
        client = storage.Client(credentials=credentials, project=settings.GCS_PROJECT_ID)
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        
        # CORS設定の読み込み
        cors_config = [
            {
                "origin": ["*"],
                "method": ["GET", "HEAD", "OPTIONS"],
                "responseHeader": ["Content-Type", "Content-Range", "Date", "Etag", "Expires", "Last-Modified"],
                "maxAgeSeconds": 3600
            }
        ]
        
        # CORS設定の適用
        bucket.cors = cors_config
        bucket.patch()
        
        print(f"✅ CORS設定を適用しました: {settings.GCS_BUCKET_NAME}")
        print("🔧 設定内容:")
        for rule in cors_config:
            print(f"  - Origin: {rule['origin']}")
            print(f"  - Methods: {rule['method']}")
            print(f"  - Headers: {rule['responseHeader']}")
            print(f"  - Max Age: {rule['maxAgeSeconds']}秒")
        
        return True
        
    except Exception as e:
        print(f"❌ CORS設定エラー: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔧 GCS CORS設定適用開始")
    print("=" * 50)
    
    success = apply_cors_settings()
    
    if success:
        print("\n🎉 CORS設定完了！")
        print("✨ フロントエンドから画像への直接アクセスが可能になりました")
    else:
        print("\n💥 CORS設定失敗")
        print("🔧 認証情報やバケット名を確認してください")
    
    print("=" * 50)
