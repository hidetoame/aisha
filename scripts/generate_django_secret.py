#!/usr/bin/env python3
"""
Django Secret Key Generator
本番環境用の安全なシークレットキーを生成します
"""

import secrets
import string

def generate_django_secret_key(length=50):
    """
    Djangoで使用する安全なシークレットキーを生成
    """
    # 使用する文字: 英数字と特殊文字（一部）
    characters = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"
    
    # ランダムに文字を選択
    secret_key = ''.join(secrets.choice(characters) for _ in range(length))
    
    return secret_key

if __name__ == "__main__":
    # 50文字のシークレットキーを生成
    secret_key = generate_django_secret_key(50)
    
    print("=" * 60)
    print("Django Secret Key (本番環境用)")
    print("=" * 60)
    print(secret_key)
    print("=" * 60)
    print("\nこのキーをGitHub Secretsの DJANGO_SECRET_KEY に設定してください。")
    print("注意: このキーは一度だけ生成し、安全に保管してください。")