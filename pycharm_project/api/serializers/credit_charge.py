from rest_framework import serializers
from decimal import Decimal
from ..models import CreditCharge, UserCredit, CreditTransaction


class CreditChargeRequestSerializer(serializers.Serializer):
    """クレジットチャージリクエスト用シリアライザ"""
    user_id = serializers.CharField(max_length=100)
    charge_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('100'))
    credit_amount = serializers.IntegerField(min_value=1)
    
    def validate_charge_amount(self, value):
        """チャージ金額のバリデーション"""
        if value < Decimal('100'):
            raise serializers.ValidationError("最小チャージ金額は¥100です")
        if value > Decimal('100000'):
            raise serializers.ValidationError("最大チャージ金額は¥100,000です")
        return value
    
    def validate_credit_amount(self, value):
        """クレジット金額のバリデーション"""
        if value < 1:
            raise serializers.ValidationError("付与クレジットは1以上である必要があります")
        if value > 100000:
            raise serializers.ValidationError("付与クレジットは100,000以下である必要があります")
        return value


class CreditChargeSerializer(serializers.ModelSerializer):
    """クレジットチャージ用シリアライザ"""
    
    class Meta:
        model = CreditCharge
        fields = [
            'id', 'user_id', 'charge_amount', 'credit_amount',
            'stripe_payment_intent_id', 'stripe_client_secret',
            'payment_status', 'error_message',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'stripe_payment_intent_id', 'stripe_client_secret',
            'payment_status', 'error_message', 'created_at', 'updated_at', 'completed_at'
        ]


class UserCreditSerializer(serializers.ModelSerializer):
    """ユーザークレジット用シリアライザ"""
    
    class Meta:
        model = UserCredit
        fields = ['user_id', 'credit_balance', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class CreditTransactionSerializer(serializers.ModelSerializer):
    """クレジット取引履歴用シリアライザ"""
    
    class Meta:
        model = CreditTransaction
        fields = [
            'id', 'user_id', 'transaction_type', 'amount', 'balance_after',
            'charge', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StripePaymentIntentSerializer(serializers.Serializer):
    """Stripe PaymentIntent レスポンス用シリアライザ"""
    payment_intent_id = serializers.CharField()
    client_secret = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(default='jpy')
    status = serializers.CharField()


class PaymentConfirmSerializer(serializers.Serializer):
    """決済確認用シリアライザ"""
    payment_intent_id = serializers.CharField()
    user_id = serializers.CharField()
