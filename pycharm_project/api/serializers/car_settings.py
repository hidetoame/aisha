from rest_framework import serializers
from api.models import CarSettings


class CarSettingsSerializer(serializers.ModelSerializer):
    """愛車設定シリアライザー"""
    
    class Meta:
        model = CarSettings
        fields = [
            'id',
            'user_id',
            'car_id',
            'license_plate_text',
            'logo_mark_image_url',
            'original_number_image_url',
            'car_name',
            'car_photo_front_url',
            'car_photo_side_url',
            'car_photo_rear_url',
            'car_photo_diagonal_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """バリデーション"""
        user_id = data.get('user_id')
        car_id = data.get('car_id')
        
        if not user_id:
            raise serializers.ValidationError("user_idは必須です")
        if not car_id:
            raise serializers.ValidationError("car_idは必須です")
            
        return data


class CarSettingsCreateUpdateSerializer(serializers.Serializer):
    """愛車設定作成・更新用シリアライザー（ファイルアップロード対応）"""
    
    # 基本情報
    user_id = serializers.CharField(max_length=100)
    car_id = serializers.CharField(max_length=100)
    
    # ナンバー管理
    license_plate_text = serializers.CharField(max_length=200, required=False, allow_blank=True)
    logo_mark_image = serializers.ImageField(required=False)
    original_number_image = serializers.ImageField(required=False)
    
    # リファレンス登録
    car_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    
    # 愛車写真
    car_photo_front = serializers.ImageField(required=False)
    car_photo_side = serializers.ImageField(required=False)
    car_photo_rear = serializers.ImageField(required=False)
    car_photo_diagonal = serializers.ImageField(required=False)
    
    def validate(self, data):
        """バリデーション"""
        user_id = data.get('user_id')
        car_id = data.get('car_id')
        
        if not user_id:
            raise serializers.ValidationError("user_idは必須です")
        if not car_id:
            raise serializers.ValidationError("car_idは必須です")
            
        return data 