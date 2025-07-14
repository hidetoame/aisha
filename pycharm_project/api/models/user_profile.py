from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """ユーザープロフィールモデル - Django標準Userモデルを拡張"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_admin = models.BooleanField(default=False, verbose_name='管理者フラグ')
    frontend_user_id = models.CharField(max_length=100, blank=True, verbose_name='フロントエンドユーザーID')
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'ユーザープロフィール'
        verbose_name_plural = 'ユーザープロフィール'
        indexes = [
            models.Index(fields=['frontend_user_id']),
            models.Index(fields=['is_admin']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - Admin: {self.is_admin}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """新しいUserが作成されたときに自動的にUserProfileを作成"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Userが保存されたときにUserProfileも保存"""
    if hasattr(instance, 'profile'):
        instance.profile.save()