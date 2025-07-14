from django.contrib.auth.models import User
from django.db import transaction
from ..models.user_profile import UserProfile


class UserService:
    """ユーザー管理サービス"""
    
    @staticmethod
    def get_user_by_frontend_id(frontend_user_id):
        """フロントエンドユーザーIDでユーザーを取得"""
        try:
            profile = UserProfile.objects.select_related('user').get(frontend_user_id=frontend_user_id)
            return profile.user
        except UserProfile.DoesNotExist:
            return None
    
    @staticmethod
    def get_user_profile_by_frontend_id(frontend_user_id):
        """フロントエンドユーザーIDでユーザープロフィールを取得"""
        try:
            return UserProfile.objects.select_related('user').get(frontend_user_id=frontend_user_id)
        except UserProfile.DoesNotExist:
            return None
    
    @staticmethod
    def is_admin_user(user):
        """ユーザーが管理者かどうかを判定"""
        if isinstance(user, User):
            return hasattr(user, 'profile') and user.profile.is_admin
        return False
    
    @staticmethod
    def is_admin_by_frontend_id(frontend_user_id):
        """フロントエンドユーザーIDから管理者かどうかを判定"""
        profile = UserService.get_user_profile_by_frontend_id(frontend_user_id)
        return profile.is_admin if profile else False
    
    @staticmethod
    def set_admin_status(user, is_admin):
        """ユーザーの管理者ステータスを設定"""
        if isinstance(user, User):
            if hasattr(user, 'profile'):
                user.profile.is_admin = is_admin
                user.profile.save()
                return True
            else:
                # プロフィールが存在しない場合は作成
                UserProfile.objects.create(user=user, is_admin=is_admin)
                return True
        return False
    
    @staticmethod
    def set_admin_by_frontend_id(frontend_user_id, is_admin):
        """フロントエンドユーザーIDから管理者ステータスを設定"""
        profile = UserService.get_user_profile_by_frontend_id(frontend_user_id)
        if profile:
            profile.is_admin = is_admin
            profile.save()
            return True
        return False
    
    @staticmethod
    def create_user_with_profile(username, email, frontend_user_id=None, is_admin=False):
        """ユーザーとプロフィールを同時に作成"""
        with transaction.atomic():
            user = User.objects.create_user(username=username, email=email)
            profile = UserProfile.objects.create(
                user=user,
                frontend_user_id=frontend_user_id or '',
                is_admin=is_admin
            )
            return user, profile
    
    @staticmethod
    def get_all_admin_users():
        """すべての管理者ユーザーを取得"""
        return User.objects.filter(profile__is_admin=True).select_related('profile')
    
    @staticmethod
    def link_frontend_user_id(user, frontend_user_id):
        """既存ユーザーにフロントエンドユーザーIDを関連付け"""
        if isinstance(user, User):
            if hasattr(user, 'profile'):
                user.profile.frontend_user_id = frontend_user_id
                user.profile.save()
                return True
            else:
                # プロフィールが存在しない場合は作成
                UserProfile.objects.create(user=user, frontend_user_id=frontend_user_id)
                return True
        return False