from rest_framework import serializers
from ..models import Comment, Like, Library, PublicComment


class UnifiedCommentSerializer(serializers.Serializer):
    """統合コメントシリアライザー（認証ユーザー + ゲストユーザー）"""
    id = serializers.UUIDField(read_only=True)
    user_id = serializers.CharField(required=False, allow_blank=True)
    user_name = serializers.CharField()
    content = serializers.CharField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    is_guest = serializers.BooleanField(read_only=True)
    
    def to_representation(self, instance):
        """
        CommentモデルとPublicCommentモデルの両方を扱えるようにする
        """
        if isinstance(instance, Comment):
            return {
                'id': str(instance.id),
                'user_id': instance.user_id,
                'user_name': instance.user_name,
                'content': instance.content,
                'created_at': instance.created_at,
                'updated_at': instance.updated_at,
                'is_guest': False
            }
        elif isinstance(instance, PublicComment):
            return {
                'id': str(instance.id),
                'user_id': None,
                'user_name': instance.author_name,
                'content': instance.content,
                'created_at': instance.created_at,
                'updated_at': instance.created_at,  # PublicCommentにはupdated_atがない
                'is_guest': True
            }
        return super().to_representation(instance)


class CommentSerializer(serializers.ModelSerializer):
    """コメントのシリアライザー"""
    
    class Meta:
        model = Comment
        fields = [
            'id',
            'library',
            'user_id',
            'user_name',
            'content',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_content(self, value):
        """コメント内容のバリデーション"""
        if not value.strip():
            raise serializers.ValidationError("コメント内容は必須です。")
        if len(value) > 500:
            raise serializers.ValidationError("コメントは500文字以内で入力してください。")
        return value.strip()


class CommentCreateSerializer(serializers.ModelSerializer):
    """コメント作成用のシリアライザー"""
    
    class Meta:
        model = Comment
        fields = ['content']
    
    def validate_content(self, value):
        """コメント内容のバリデーション"""
        if not value.strip():
            raise serializers.ValidationError("コメント内容は必須です。")
        if len(value) > 500:
            raise serializers.ValidationError("コメントは500文字以内で入力してください。")
        return value.strip()


class LikeSerializer(serializers.ModelSerializer):
    """いいねのシリアライザー"""
    
    class Meta:
        model = Like
        fields = [
            'id',
            'library',
            'user_id',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']