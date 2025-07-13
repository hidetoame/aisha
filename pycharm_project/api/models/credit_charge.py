from django.db import models
from django.utils import timezone


class CreditCharge(models.Model):
    """クレジットチャージ記録モデル"""
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', '決済処理中'),
        ('succeeded', '決済成功'),
        ('failed', '決済失敗'),
        ('canceled', '決済キャンセル'),
        ('refunded', '返金済み'),
    ]
    
    # ユーザー情報
    user_id = models.CharField(max_length=100, verbose_name='ユーザーID')
    
    # チャージ情報
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='チャージ金額')
    credit_amount = models.IntegerField(verbose_name='付与クレジット')
    
    # Stripe情報
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, verbose_name='Stripe決済ID')
    stripe_client_secret = models.CharField(max_length=255, blank=True, null=True, verbose_name='Stripeクライアントシークレット')
    
    # 決済ステータス
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='pending',
        verbose_name='決済ステータス'
    )
    
    # メタデータ
    stripe_metadata = models.JSONField(default=dict, blank=True, verbose_name='Stripeメタデータ')
    error_message = models.TextField(blank=True, null=True, verbose_name='エラーメッセージ')
    
    # タイムスタンプ
    created_at = models.DateTimeField(default=timezone.now, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name='完了日時')
    
    class Meta:
        db_table = 'credit_charges'
        verbose_name = 'クレジットチャージ'
        verbose_name_plural = 'クレジットチャージ'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"User {self.user_id} - ¥{self.charge_amount} ({self.payment_status})"
    
    def mark_completed(self, status='succeeded'):
        """決済完了としてマーク"""
        self.payment_status = status
        self.completed_at = timezone.now()
        self.save()
    
    def mark_failed(self, error_message=None):
        """決済失敗としてマーク"""
        self.payment_status = 'failed'
        if error_message:
            self.error_message = error_message
        self.completed_at = timezone.now()
        self.save()


class UserCredit(models.Model):
    """ユーザークレジット残高モデル"""
    
    user_id = models.CharField(max_length=100, unique=True, verbose_name='ユーザーID')
    credit_balance = models.IntegerField(default=0, verbose_name='クレジット残高')
    
    # タイムスタンプ
    created_at = models.DateTimeField(default=timezone.now, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        db_table = 'user_credits'
        verbose_name = 'ユーザークレジット'
        verbose_name_plural = 'ユーザークレジット'
    
    def __str__(self):
        return f"User {self.user_id} - {self.credit_balance} credits"
    
    def add_credits(self, amount):
        """クレジットを追加"""
        self.credit_balance += amount
        self.save()
    
    def deduct_credits(self, amount):
        """クレジットを消費"""
        if self.credit_balance >= amount:
            self.credit_balance -= amount
            self.save()
            return True
        return False


class CreditTransaction(models.Model):
    """クレジット取引履歴モデル"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('charge', 'チャージ'),
        ('usage', '使用'),
        ('refund', '返金'),
        ('bonus', 'ボーナス'),
    ]
    
    user_id = models.CharField(max_length=100, verbose_name='ユーザーID')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, verbose_name='取引種別')
    amount = models.IntegerField(verbose_name='クレジット金額')
    balance_after = models.IntegerField(verbose_name='取引後残高')
    
    # 関連情報
    charge = models.ForeignKey(
        CreditCharge, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name='関連チャージ'
    )
    description = models.CharField(max_length=255, blank=True, verbose_name='説明')
    
    # タイムスタンプ
    created_at = models.DateTimeField(default=timezone.now, verbose_name='作成日時')
    
    class Meta:
        db_table = 'credit_transactions'
        verbose_name = 'クレジット取引履歴'
        verbose_name_plural = 'クレジット取引履歴'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"User {self.user_id} - {self.transaction_type}: {self.amount} credits"
