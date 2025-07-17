from django.db import models
from django.contrib.auth.models import User
import uuid

class MyGarageUser(models.Model):
    """
    MyGarage認証システム用のユーザーモデル
    FirebaseやSMS認証とは独立したシステム
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mygarage_user_id = models.CharField(max_length=100, unique=True, db_index=True, help_text="MyGarageシステムのユーザーID")
    email = models.EmailField(help_text="MyGarageアカウントのメールアドレス")
    name = models.CharField(max_length=200, help_text="MyGarageアカウントの名前")
    
    # AISHA固有の設定
    is_admin = models.BooleanField(default=False, help_text="AISHA管理者フラグ")
    credits = models.IntegerField(default=100, help_text="AISHAクレジット残高（MyGarage認証では100クレジット）")
    
    # 連携用フィールド
    last_login_token = models.CharField(max_length=500, blank=True, help_text="最後のログイントークン")
    last_token_expires = models.DateTimeField(null=True, blank=True, help_text="トークンの有効期限")
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, help_text="AISHA初回ログイン日時")
    updated_at = models.DateTimeField(auto_now=True, help_text="最終更新日時")
    last_login = models.DateTimeField(null=True, blank=True, help_text="最終ログイン日時")
    
    class Meta:
        db_table = 'mygarage_users'
        verbose_name = 'MyGarageユーザー'
        verbose_name_plural = 'MyGarageユーザー'
        indexes = [
            models.Index(fields=['mygarage_user_id']),
            models.Index(fields=['email']),
            models.Index(fields=['is_admin']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.email}) - ID: {self.mygarage_user_id}"
    
    def is_token_valid(self):
        """トークンが有効かどうかを判定"""
        if not self.last_login_token or not self.last_token_expires:
            return False
        
        from django.utils import timezone
        return timezone.now() < self.last_token_expires
    
    def get_credits(self):
        """クレジット残高を取得（MyGarage認証では固定で100）"""
        return 100
    
    def consume_credits(self, amount):
        """
        クレジット消費処理
        MyGarage認証では実際の消費は行わず、常に100クレジットを保持
        """
        # 実際の消費処理をここに実装する場合は、別途課金システムと連携
        return True
    
    def add_credits(self, amount):
        """
        クレジット追加処理
        MyGarage認証では実際の追加は行わず、常に100クレジットを保持
        """
        # 実際の追加処理をここに実装する場合は、別途課金システムと連携
        return True


class MyGarageCreditTransaction(models.Model):
    """
    MyGarageユーザーのクレジット取引履歴
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mygarage_user = models.ForeignKey(MyGarageUser, on_delete=models.CASCADE, related_name='credit_transactions')
    
    # 取引種別
    TRANSACTION_TYPES = [
        ('initial', '初回登録ボーナス'),
        ('consume', 'クレジット消費'),
        ('purchase', 'クレジット購入'),
        ('admin_add', '管理者追加'),
        ('admin_subtract', '管理者減算'),
    ]
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, help_text="取引種別")
    amount = models.IntegerField(help_text="取引金額（正数：追加、負数：消費）")
    description = models.CharField(max_length=500, help_text="取引説明")
    
    # 取引前後の残高
    balance_before = models.IntegerField(help_text="取引前残高")
    balance_after = models.IntegerField(help_text="取引後残高")
    
    # 関連情報
    related_menu_id = models.IntegerField(null=True, blank=True, help_text="関連するメニューID")
    related_image_url = models.URLField(null=True, blank=True, help_text="関連する画像URL")
    
    # タイムスタンプ
    created_at = models.DateTimeField(auto_now_add=True, help_text="取引日時")
    
    class Meta:
        db_table = 'mygarage_credit_transactions'
        verbose_name = 'MyGarageクレジット取引'
        verbose_name_plural = 'MyGarageクレジット取引'
        indexes = [
            models.Index(fields=['mygarage_user', 'created_at']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.mygarage_user.name} - {self.get_transaction_type_display()}: {self.amount}"