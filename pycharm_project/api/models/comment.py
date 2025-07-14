from django.db import models
from .library import Library
import uuid


class Comment(models.Model):
    """
    ライブラリ画像に対するコメントモデル
    """
    
    # プライマリキー（UUIDを使用）
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 関連するライブラリ画像
    library = models.ForeignKey(
        Library, 
        on_delete=models.CASCADE, 
        related_name='comments',
        help_text="コメント対象のライブラリ画像"
    )
    
    # コメント作成者情報
    user_id = models.CharField(max_length=100, help_text="MyGarageユーザーID")
    user_name = models.CharField(max_length=200, help_text="コメント表示用のユーザー名")
    
    # コメント内容
    content = models.TextField(max_length=500, help_text="コメント本文（500文字まで）")
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, help_text="作成日時")
    updated_at = models.DateTimeField(auto_now=True, help_text="更新日時")
    
    class Meta:
        db_table = 'api_comment'
        ordering = ['created_at']  # 古い順（チャット形式）
        indexes = [
            models.Index(fields=['library', 'created_at']),
            models.Index(fields=['user_id', '-created_at']),
            models.Index(fields=['library', '-created_at']),
        ]
    
    def __str__(self):
        return f"Comment({self.user_name}, {self.library.id}, {self.created_at.strftime('%Y-%m-%d %H:%M')})"


class Like(models.Model):
    """
    ライブラリ画像に対するいいねモデル
    """
    
    # プライマリキー（UUIDを使用）
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 関連するライブラリ画像
    library = models.ForeignKey(
        Library, 
        on_delete=models.CASCADE, 
        related_name='likes',
        help_text="いいね対象のライブラリ画像"
    )
    
    # いいねしたユーザー
    user_id = models.CharField(max_length=100, help_text="MyGarageユーザーID")
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, help_text="いいねした日時")
    
    class Meta:
        db_table = 'api_like'
        unique_together = ['library', 'user_id']  # 同じユーザーが同じ画像に複数いいねできない
        indexes = [
            models.Index(fields=['library', 'user_id']),
            models.Index(fields=['user_id', '-created_at']),
            models.Index(fields=['library', '-created_at']),
        ]
    
    def __str__(self):
        return f"Like({self.user_id}, {self.library.id}, {self.created_at.strftime('%Y-%m-%d %H:%M')})"