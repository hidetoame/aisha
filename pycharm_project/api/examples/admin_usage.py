"""
Django User Admin Flag Implementation - Usage Examples

This file demonstrates how to use the new UserProfile model and admin functionality.
"""

from django.contrib.auth.models import User
from api.models.user_profile import UserProfile
from api.services.user_service import UserService


def example_usage():
    """
    新しいユーザー管理機能の使用例
    """
    
    # 1. ユーザー作成時（シグナルで自動的にプロフィールが作成される）
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )
    print(f"User created: {user.username}")
    print(f"Profile created automatically: {user.profile}")
    
    # 2. 管理者フラグを設定
    UserService.set_admin_status(user, True)
    print(f"Admin status set: {user.profile.is_admin}")
    
    # 3. フロントエンドユーザーIDを関連付け
    UserService.link_frontend_user_id(user, 'frontend_user_123')
    print(f"Frontend user ID linked: {user.profile.frontend_user_id}")
    
    # 4. フロントエンドユーザーIDから管理者判定
    is_admin = UserService.is_admin_by_frontend_id('frontend_user_123')
    print(f"Is admin by frontend ID: {is_admin}")
    
    # 5. 管理者ユーザー一覧を取得
    admin_users = UserService.get_all_admin_users()
    print(f"Admin users count: {admin_users.count()}")
    
    # 6. ユーザー作成時に管理者フラグを同時に設定
    admin_user, admin_profile = UserService.create_user_with_profile(
        username='admin_user',
        email='admin@example.com',
        frontend_user_id='frontend_admin_456',
        is_admin=True
    )
    print(f"Admin user created: {admin_user.username} - Admin: {admin_profile.is_admin}")


def api_usage_examples():
    """
    API エンドポイントの使用例
    """
    
    # 以下のAPIエンドポイントが利用可能:
    
    # 1. ユーザープロフィール取得
    # GET /api/users/{frontend_user_id}/profile/
    # Response: {"id": 1, "username": "testuser", "email": "test@example.com", "is_admin": false, ...}
    
    # 2. 管理者ステータス確認
    # GET /api/users/{frontend_user_id}/admin-status/
    # Response: {"frontend_user_id": "frontend_user_123", "is_admin": true}
    
    # 3. 管理者ステータス設定
    # POST /api/users/{frontend_user_id}/admin-status/set/
    # Body: {"is_admin": true}
    # Response: {"message": "Admin status updated successfully", "frontend_user_id": "frontend_user_123", "is_admin": true}
    
    # 4. 管理者ユーザー一覧取得
    # GET /api/users/admin/
    # Response: {"count": 2, "admin_users": [...]}
    
    # 5. DjangoユーザーにフロントエンドユーザーIDを関連付け
    # POST /api/users/{user_id}/link-frontend/
    # Body: {"frontend_user_id": "frontend_user_789"}
    # Response: {"message": "Frontend user ID linked successfully", "user_id": 1, "frontend_user_id": "frontend_user_789"}
    
    pass


def migration_notes():
    """
    マイグレーションとデータベース変更に関する注意事項
    """
    
    # 1. 作成したファイル:
    # - api/models/user_profile.py
    # - api/migrations/0008_add_user_profile.py
    # - api/services/user_service.py
    # - api/serializers/user_profile.py
    # - api/views/user_admin.py
    
    # 2. 変更したファイル:
    # - api/models/__init__.py (UserProfile追加)
    # - api/admin.py (管理画面カスタマイズ)
    # - api/urls.py (新しいエンドポイント追加)
    
    # 3. 実行すべきコマンド:
    # python manage.py migrate
    
    # 4. 管理画面での操作:
    # - Django Admin (/admin/) でユーザーを編集すると、プロフィールセクションが表示される
    # - 管理者フラグの設定・確認が可能
    # - フロントエンドユーザーIDの関連付けが可能
    
    pass


if __name__ == "__main__":
    print("User Admin Flag Implementation - Usage Examples")
    print("=" * 50)
    
    # 実際のサンプルコード実行（開発環境でのみ）
    # example_usage()
    
    print("\nAPI Usage Examples:")
    api_usage_examples()
    
    print("\nMigration Notes:")
    migration_notes()