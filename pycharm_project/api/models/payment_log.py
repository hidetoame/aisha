from django.db import models
from django.utils import timezone


class PaymentLog(models.Model):
    """
    決済ログモデル
    Stripe Webhookからの決済結果を記録
    """
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', '処理中'),
        ('success', '成功'),
        ('failed', '失敗'),
        ('cancelled', 'キャンセル'),
    ]
    
    payment_intent_id = models.CharField(
        max_length=255,
        verbose_name='Payment Intent ID',
        help_text='Stripe Payment Intent ID'
    )
    
    status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        verbose_name='決済状態'
    )
    
    amount = models.IntegerField(
        verbose_name='金額（円）',
        help_text='決済金額（円単位）'
    )
    
    currency = models.CharField(
        max_length=3,
        default='jpy',
        verbose_name='通貨',
        help_text='ISO通貨コード（例: jpy, usd）'
    )
    
    customer_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='顧客ID',
        help_text='Stripe Customer ID'
    )
    
    error_message = models.TextField(
        null=True,
        blank=True,
        verbose_name='エラーメッセージ',
        help_text='決済失敗時のエラーメッセージ'
    )
    
    webhook_event_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='Webhookイベントタイプ',
        help_text='Stripe Webhookイベントタイプ'
    )
    
    raw_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name='生データ',
        help_text='Stripeからの生Webhookデータ'
    )
    
    processed = models.BooleanField(
        default=False,
        verbose_name='処理済み',
        help_text='決済結果の処理が完了したかどうか'
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
        db_table = 'payment_logs'
        verbose_name = '決済ログ'
        verbose_name_plural = '決済ログ'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment_intent_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['customer_id']),
        ]
    
    def __str__(self):
        return f"{self.payment_intent_id} - {self.status} - {self.amount}{self.currency}"
    
    @property
    def is_success(self):
        """決済が成功したかどうか"""
        return self.status == 'success'
    
    @property
    def is_failed(self):
        """決済が失敗したかどうか"""
        return self.status == 'failed'
    
    @property
    def formatted_amount(self):
        """フォーマットされた金額"""
        if self.currency == 'jpy':
            return f"¥{self.amount:,}"
        else:
            return f"{self.amount} {self.currency.upper()}" 