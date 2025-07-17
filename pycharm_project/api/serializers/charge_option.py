from rest_framework import serializers
from ..models import ChargeOption


class ChargeOptionSerializer(serializers.ModelSerializer):
    """チャージオプションシリアライザー"""
    
    display_info = serializers.CharField(source='description', required=False, allow_blank=True)
    total_credits = serializers.ReadOnlyField()
    price_yen = serializers.SerializerMethodField()
    
    def get_price_yen(self, obj):
        """価格を整数で返す"""
        return int(obj.price_yen)
    
    class Meta:
        model = ChargeOption
        fields = [
            'id',
            'name',
            'description', 
            'price_yen',
            'credits_awarded',
            'credits_bonus',
            'total_credits',
            'display_info',
            'display_order',
            'is_active',
            'is_popular',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChargeOptionCreateSerializer(serializers.ModelSerializer):
    """チャージオプション作成用シリアライザー"""
    
    display_info = serializers.CharField(source='description', required=False, allow_blank=True)
    
    class Meta:
        model = ChargeOption
        fields = [
            'name',
            'description',
            'display_info',
            'price_yen', 
            'credits_awarded',
            'credits_bonus',
            'display_order',
            'is_active',
            'is_popular'
        ]
        
    def validate_price_yen(self, value):
        """価格の検証"""
        if value <= 0:
            raise serializers.ValidationError("価格は0より大きい値である必要があります")
        return value
        
    def validate_credits_awarded(self, value):
        """付与クレジットの検証"""
        if value <= 0:
            raise serializers.ValidationError("付与クレジットは0より大きい値である必要があります")
        return value


class ChargeOptionUpdateSerializer(serializers.ModelSerializer):
    """チャージオプション更新用シリアライザー"""
    
    display_info = serializers.CharField(source='description', required=False, allow_blank=True)
    
    class Meta:
        model = ChargeOption
        fields = [
            'name',
            'description',
            'display_info',
            'price_yen',
            'credits_awarded', 
            'credits_bonus',
            'display_order',
            'is_active',
            'is_popular'
        ]