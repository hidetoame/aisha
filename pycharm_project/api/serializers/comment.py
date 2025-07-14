from rest_framework import serializers
from ..models import Comment, Like, Library


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