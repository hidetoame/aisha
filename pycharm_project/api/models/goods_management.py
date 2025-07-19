from django.db import models


class GoodsManagement(models.Model):
    """
    グッズ管理モデル
    SUZURI APIのアイテム情報を管理し、公開/非公開フラグを制御
    """
    
    SUPPLIER_CHOICES = [
        ('suzuri', 'SUZURI'),
        ('printful', 'Printful'),
        ('spreadshirt', 'Spreadshirt'),
    ]
    
    supplier = models.CharField(
        max_length=50, 
        choices=SUPPLIER_CHOICES, 
        default='suzuri',
        verbose_name='サプライヤー'
    )
    
    suzuri_item_id = models.IntegerField(
        verbose_name='SUZURIアイテムID'
    )
    
    item_name = models.CharField(
        max_length=255,
        verbose_name='アイテム名'
    )
    
    display_name = models.CharField(
        max_length=255,
        verbose_name='表示名'
    )
    
    display_order = models.IntegerField(
        default=0,
        verbose_name='表示順序'
    )
    
    icon_url = models.TextField(
        blank=True,
        null=True,
        verbose_name='アイコン画像URL'
    )
    
    sample_image_url = models.TextField(
        blank=True,
        null=True,
        verbose_name='サンプル画像URL'
    )
    
    descriptions = models.JSONField(
        default=list,
        verbose_name='商品説明文'
    )
    
    base_price = models.IntegerField(
        default=0,
        verbose_name='基本価格'
    )
    
    profit_margin = models.IntegerField(
        default=0,
        verbose_name='追加利益'
    )
    
    available_print_places = models.JSONField(
        default=list,
        verbose_name='利用可能なプリント位置'
    )
    
    is_multi_printable = models.BooleanField(
        default=False,
        verbose_name='複数箇所プリント可能'
    )
    
    is_public = models.BooleanField(
        default=False,
        verbose_name='公開フラグ'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'goods_management'
        verbose_name = 'グッズ管理'
        verbose_name_plural = 'グッズ管理'
        ordering = ['display_order', 'id']
        unique_together = ['supplier', 'suzuri_item_id']
    
    def __str__(self):
        return f"{self.display_name} ({self.supplier})"
    
    @property
    def final_price(self):
        """最終価格（基本価格 + 追加利益）"""
        return self.base_price + self.profit_margin 