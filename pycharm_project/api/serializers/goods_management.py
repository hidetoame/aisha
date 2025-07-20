from rest_framework import serializers
from api.models.goods_management import GoodsManagement


class GoodsManagementSerializer(serializers.ModelSerializer):
    """
    グッズ管理シリアライザー
    """
    final_price = serializers.ReadOnlyField()
    
    class Meta:
        model = GoodsManagement
        fields = [
            'id',
            'supplier',
            'suzuri_item_id',
            'item_name',
            'display_name',
            'display_order',
            'icon_url',
            'sample_image_url',
            'descriptions',
            'base_price',
            'profit_margin',
            'final_price',
            'available_print_places',
            'is_multi_printable',
            'is_public',
            'needs_sub_materials',
            'item_type',
            'api_config',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class GoodsManagementListSerializer(serializers.ModelSerializer):
    """
    グッズ管理一覧用シリアライザー（軽量版）
    """
    final_price = serializers.ReadOnlyField()
    
    class Meta:
        model = GoodsManagement
        fields = [
            'id',
            'supplier',
            'suzuri_item_id',
            'item_name',
            'display_name',
            'display_order',
            'icon_url',
            'base_price',
            'profit_margin',
            'final_price',
            'descriptions',
            'is_public',
            'needs_sub_materials',
            'item_type',
            'api_config',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class GoodsManagementUpdateSerializer(serializers.ModelSerializer):
    """
    グッズ管理更新用シリアライザー
    """
    class Meta:
        model = GoodsManagement
        fields = [
            'display_name',
            'display_order',
            'profit_margin',
            'is_public',
            'needs_sub_materials',
            'item_type',
            'api_config'
        ] 