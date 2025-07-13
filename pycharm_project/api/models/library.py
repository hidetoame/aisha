from django.db import models
import uuid


class Library(models.Model):
    """
    ユーザーのライブラリ（生成画像保存）モデル
    フロントエンドのGeneratedImage型に対応
    """
    
    # プライマリキー（UUIDを使用）
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # ユーザー情報
    user_id = models.CharField(max_length=100, help_text="MyGarageユーザーID")
    
    # フロントエンドとの連携用ID
    frontend_id = models.CharField(max_length=100, help_text="フロントエンドで使用するID")
    
    # 画像情報
    image_url = models.URLField(max_length=1000, help_text="生成画像のURL（GCS等）")
    display_prompt = models.TextField(help_text="表示用プロンプト")
    menu_name = models.CharField(max_length=200, blank=True, null=True, help_text="使用したメニュー名")
    
    # 生成時の設定情報（JSON形式で保存）
    used_form_data = models.JSONField(help_text="生成時に使用したフォームデータ（MenuExecutionFormData）")
    
    # 評価・公開設定
    rating = models.CharField(
        max_length=10, 
        choices=[('good', 'Good'), ('bad', 'Bad')], 
        blank=True, 
        null=True,
        help_text="ユーザー評価"
    )
    is_public = models.BooleanField(default=False, help_text="公開設定")
    author_name = models.CharField(max_length=200, blank=True, null=True, help_text="公開時の作者名")
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, help_text="作成日時")
    updated_at = models.DateTimeField(auto_now=True, help_text="更新日時")
    # フロントエンドのtimestampフィールドに対応
    timestamp = models.DateTimeField(help_text="生成日時（フロントエンドのtimestampに対応）")
    
    class Meta:
        db_table = 'api_library'
        ordering = ['-timestamp']  # 生成日時の新しい順に並べる
        indexes = [
            models.Index(fields=['user_id', '-timestamp']),
            models.Index(fields=['is_public', '-timestamp']),
            models.Index(fields=['user_id', 'is_public']),
            models.Index(fields=['frontend_id']),
        ]
    
    def __str__(self):
        return f"Library({self.user_id}, {self.menu_name or 'No Menu'}, {self.timestamp.strftime('%Y-%m-%d %H:%M')})" 