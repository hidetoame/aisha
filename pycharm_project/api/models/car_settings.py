from django.db import models


class CarSettings(models.Model):
    """愛車設定モデル"""
    
    # ユーザー・愛車情報
    user_id = models.CharField(max_length=100, help_text="MyGarageユーザーID")
    car_id = models.CharField(max_length=100, help_text="MyGarage愛車ID")
    
    # ナンバー管理設定
    license_plate_text = models.CharField(
        max_length=200, 
        blank=True, 
        null=True, 
        help_text="ナンバープレート文字列（例: 横浜 330 な 2960）"
    )
    logo_mark_image_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="ロゴマーク画像のS3 URL"
    )
    original_number_image_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="オリジナルナンバー画像のS3 URL"
    )
    
    # リファレンス登録
    car_name = models.CharField(
        max_length=200, 
        blank=True, 
        null=True, 
        help_text="愛車名前"
    )
    
    # 愛車写真（4方向）
    car_photo_front_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="フロント写真のS3 URL"
    )
    car_photo_side_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="サイド写真のS3 URL"
    )
    car_photo_rear_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="リア写真のS3 URL"
    )
    car_photo_diagonal_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="斜め前右写真のS3 URL"
    )
    
    # メタデータ
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'car_settings'
        verbose_name = '愛車設定'
        verbose_name_plural = '愛車設定'
        # ユーザーと愛車の組み合わせで一意制約
        unique_together = ['user_id', 'car_id']
        
    def __str__(self):
        return f"愛車設定 - User: {self.user_id}, Car: {self.car_id}" 