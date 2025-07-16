from django.db import models
from django.contrib.auth.models import User

class SuzuriMerchandise(models.Model):
    """SUZURI で作成されたグッズの履歴を管理するモデル"""
    
    # 基本情報
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suzuri_merchandise', null=True, blank=True)
    
    # ユーザー情報（必須）
    goods_creator_user_id = models.CharField(max_length=100, help_text="グッズを作った人のユーザーID（Firebase UID）")
    original_image_creator_user_id = models.CharField(max_length=100, help_text="元画像を生成した人のユーザーID（Firebase UID）")
    
    # 画像情報（必須）
    library_image_id = models.UUIDField(help_text="グッズを作った画像のLibrary ID")
    
    # 後方互換性のため残すフィールド
    frontend_user_id = models.CharField(max_length=100, help_text="フロントエンドのユーザーID（後方互換性）", blank=True)
    
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
    created_at = models.DateTimeField(auto_now_add=True, help_text="グッズ作成日")
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suzuri_merchandise'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['goods_creator_user_id', '-created_at']),
            models.Index(fields=['original_image_creator_user_id', '-created_at']),
            models.Index(fields=['library_image_id']),
            models.Index(fields=['product_id']),
            models.Index(fields=['frontend_user_id', '-created_at']),  # 後方互換性
        ]
    
    def __str__(self):
        return f"{self.product_title} ({self.car_name}) - {self.created_at.strftime('%Y-%m-%d')}"
