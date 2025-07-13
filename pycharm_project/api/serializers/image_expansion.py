from rest_framework import serializers

# 利用可能なアンカーポジション
ANCHOR_POSITION_CHOICES = [
    ('top-left', 'Top Left'),
    ('top-center', 'Top Center'),
    ('top-right', 'Top Right'),
    ('mid-left', 'Mid Left'),
    ('center', 'Center'),
    ('mid-right', 'Mid Right'),
    ('bottom-left', 'Bottom Left'),
    ('bottom-center', 'Bottom Center'),
    ('bottom-right', 'Bottom Right'),
]

class ImageExpansionRequestSerializer(serializers.Serializer):
    """
    画像拡張APIのリクエストデータバリデーション用シリアライザー
    """
    image_id = serializers.CharField(
        max_length=50,
        help_text="拡張する画像のfrontend_id"
    )
    
    anchor_position = serializers.ChoiceField(
        choices=ANCHOR_POSITION_CHOICES,
        default='center',
        help_text="拡張時の元画像のアンカーポジション"
    )
    
    user_id = serializers.CharField(
        max_length=100,
        help_text="ユーザーID"
    )
    
    def validate_image_id(self, value):
        """
        image_idのバリデーション
        """
        if not value or not value.strip():
            raise serializers.ValidationError("image_idは必須です")
        return value.strip()
    
    def validate_user_id(self, value):
        """
        user_idのバリデーション
        """
        if not value or not value.strip():
            raise serializers.ValidationError("user_idは必須です")
        return value.strip()


class ImageExpansionResponseSerializer(serializers.Serializer):
    """
    画像拡張APIのレスポンス用シリアライザー
    """
    success = serializers.BooleanField()
    message = serializers.CharField()
    expanded_image = serializers.DictField(help_text="拡張された画像のタイムラインエントリ")
    original_image_id = serializers.CharField(help_text="元画像のID") 