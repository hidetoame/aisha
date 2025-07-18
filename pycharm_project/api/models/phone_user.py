from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class PhoneUser(models.Model):
    """電話番号ログイン用ユーザーモデル"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firebase_uid = models.CharField(max_length=128, unique=True, db_index=True)  # Firebase UID
    phone_number = models.CharField(max_length=15, db_index=True)  # unique=True を削除（Firebase認証で管理）
    nickname = models.CharField(max_length=20)
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'phone_users'
        verbose_name = '電話番号ユーザー'
        verbose_name_plural = '電話番号ユーザー'
    
    def __str__(self):
        return f"{self.nickname} ({self.phone_number})"

class PhoneVerificationSession(models.Model):
    """電話番号認証セッション"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=15, db_index=True)
    verification_code = models.CharField(max_length=6)
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)  # AWS SMS認証用
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'phone_verification_sessions'
        verbose_name = '電話番号認証セッション'
        verbose_name_plural = '電話番号認証セッション'
    
    def __str__(self):
        return f"{self.phone_number} - {self.session_id}"

class PhoneLoginToken(models.Model):
    """電話番号ログイン用トークン"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_user = models.ForeignKey(PhoneUser, on_delete=models.CASCADE, related_name='tokens')
    token = models.CharField(max_length=100, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'phone_login_tokens'
        verbose_name = '電話番号ログイントークン'
        verbose_name_plural = '電話番号ログイントークン'
    
    def __str__(self):
        return f"{self.phone_user.nickname} - {self.token[:10]}..."