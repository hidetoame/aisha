from django.db import models
from django.utils import timezone


class ChargeOption(models.Model):
    """クレジットチャージオプションモデル"""
    
    name = models.CharField(max_length=100, verbose_name='オプション名')  # 例: "お試し最適"
    description = models.CharField(max_length=255, blank=True, verbose_name='説明')  # 例: "+10 お得"
    price_yen = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='価格（円）')  # 例: 1000.00
    credits_awarded = models.IntegerField(verbose_name='付与クレジット')  # 例: 1000
    credits_bonus = models.IntegerField(default=0, verbose_name='ボーナスクレジット')  # 例: 10
    
    # 表示用情報
    display_order = models.IntegerField(default=0, verbose_name='表示順序')
    is_active = models.BooleanField(default=True, verbose_name='有効フラグ')
    is_popular = models.BooleanField(default=False, verbose_name='人気オプション')
    
    # メタデータ
    created_at = models.DateTimeField(default=timezone.now, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        db_table = 'charge_options'
        verbose_name = 'チャージオプション'
        verbose_name_plural = 'チャージオプション'
        ordering = ['display_order', 'price_yen']
    
    def __str__(self):
        return f"{self.name} - ¥{self.price_yen} ({self.credits_awarded + self.credits_bonus}クレジット)"
    
    @property
    def total_credits(self):
        """総クレジット数（基本 + ボーナス）"""
        return self.credits_awarded + self.credits_bonus
    
    @property
    def display_info(self):
        """表示用情報（descriptionカラムから取得）"""
        return self.description