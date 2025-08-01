from django.db import models
import uuid


class PublicComment(models.Model):
    """公開画像へのコメント"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    frontend_id = models.CharField(max_length=255, db_index=True)  # Library.frontend_idと関連
    content = models.TextField(max_length=500)
    author_name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['frontend_id', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.author_name}: {self.content[:50]}..."