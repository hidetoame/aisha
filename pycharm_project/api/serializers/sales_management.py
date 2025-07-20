from rest_framework import serializers
from api.models.credit_charge import CreditCharge
from decimal import Decimal
from typing import Dict, Any


class MonthlySummarySerializer(serializers.Serializer):
    """月別集計シリアライザー"""
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    success_count = serializers.IntegerField()
    success_credit_total = serializers.IntegerField()
    success_point_total = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    
    def to_representation(self, instance: Dict[str, Any]) -> Dict[str, Any]:
        """表示用データに変換"""
        return {
            'year': instance['year'],
            'month': instance['month'],
            'success_count': instance['success_count'],
            'success_credit_total': instance['success_credit_total'],
            'success_point_total': instance['success_point_total'],
            'pending_count': instance['pending_count'],
            'month_label': f"{instance['year']}年{instance['month']}月"
        }


class MonthlyDetailSerializer(serializers.ModelSerializer):
    """月別詳細シリアライザー"""
    user_email = serializers.SerializerMethodField()
    status_text = serializers.SerializerMethodField()
    created_date = serializers.SerializerMethodField()
    
    class Meta:
        model = CreditCharge
        fields = [
            'id', 'user_id', 'user_email', 'charge_amount', 
            'credit_amount', 'payment_status', 'status_text',
            'created_at', 'created_date'
        ]
    
    def get_user_email(self, obj: CreditCharge) -> str:
        """ユーザーEmailを取得"""
        try:
            from django.contrib.auth.models import User
            user = User.objects.get(id=obj.user_id)
            return user.email
        except Exception:
            return "不明"
    
    def get_status_text(self, obj: CreditCharge) -> str:
        """ステータステキストを取得"""
        status_map = {
            'pending': '処理中',
            'succeeded': '成功',
            'failed': '失敗'
        }
        return status_map.get(obj.payment_status, obj.payment_status)
    
    def get_created_date(self, obj: CreditCharge) -> str:
        """作成日を文字列で取得"""
        return obj.created_at.strftime('%Y-%m-%d %H:%M:%S') 