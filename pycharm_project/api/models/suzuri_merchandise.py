from django.db import models
from django.contrib.auth.models import User

class SuzuriMerchandise(models.Model):
    """SUZURI で作成されたグッズの履歴を管理するモデル"""
    
    # 基本情報
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suzuri_merchandise')
    frontend_user_id = models.CharField(max_length=100, help_text="フロントエンドのユーザーID")
    
    # SUZURI API からのレスポンス情報
    product_id = models.BigIntegerField(help_text="SUZURI の商品ID")
    material_id = models.BigIntegerField(help_text="SUZURI のマテリアルID")
    product_title = models.CharField(max_length=255, help_text="商品タイトル")
    product_url = models.URLField(help_text="SUZURI の商品ページURL")
    sample_image_url = models.URLField(help_text="商品プレビュー画像URL")
    
    # 元の生成画像情報
    original_image_url = models.URLField(help_text="元の生成画像URL")
    car_name = models.CharField(max_length=100, help_text="車の名前")
    description = models.TextField(blank=True, help_text="商品説明")
    
    # アイテム情報
    item_name = models.CharField(max_length=100, help_text="アイテム名（例：heavyweight-t-shirt）")
    item_id = models.IntegerField(help_text="SUZURI のアイテムID")
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suzuri_merchandise'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['frontend_user_id', '-created_at']),
            models.Index(fields=['product_id']),
        ]
    
    def __str__(self):
        return f"{self.product_title} ({self.car_name}) - {self.created_at.strftime('%Y-%m-%d')}"
