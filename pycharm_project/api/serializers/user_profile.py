from rest_framework import serializers
from django.contrib.auth.models import User
from ..models.user_profile import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """ユーザープロフィールシリアライザー"""
    
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_admin', 'frontend_user_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserWithProfileSerializer(serializers.ModelSerializer):
    """ユーザーとプロフィールを含むシリアライザー"""
    
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'date_joined', 'profile'
        ]
        read_only_fields = ['id', 'date_joined']


class AdminStatusSerializer(serializers.Serializer):
    """管理者ステータス更新用シリアライザー"""
    
    is_admin = serializers.BooleanField()
    
    def validate_is_admin(self, value):
        """管理者ステータスの検証"""
        if not isinstance(value, bool):
            raise serializers.ValidationError("is_admin must be a boolean value")
        return value