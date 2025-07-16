from rest_framework import serializers
from api.models.library import Library
from datetime import datetime


class LibrarySerializer(serializers.ModelSerializer):
    """
    タイムライン（旧ライブラリ）のシリアライザー
    生成された全画像を管理し、フロントエンドのGeneratedImage型との相互変換を行う
    """
    
    # フロントエンドのidフィールドに対応（frontend_idを使用）
    id = serializers.CharField(source='frontend_id')
    
    # フロントエンドのurlフィールドに対応  
    url = serializers.URLField(source='image_url')
    
    # フロントエンドのdisplayPromptフィールドに対応
    displayPrompt = serializers.CharField(source='display_prompt')
    
    # フロントエンドのmenuNameフィールドに対応
    menuName = serializers.CharField(source='menu_name', required=False, allow_null=True)
    
    # フロントエンドのusedFormDataフィールドに対応
    usedFormData = serializers.JSONField(source='used_form_data')
    
    # フロントエンドのtimestampフィールドに対応
    timestamp = serializers.DateTimeField()
    
    # フロントエンドのratingフィールドに対応
    rating = serializers.CharField(required=False, allow_null=True)
    
    # フロントエンドのisPublicフィールドに対応
    isPublic = serializers.BooleanField(source='is_public')
    
    # フロントエンドのauthorNameフィールドに対応
    authorName = serializers.CharField(source='author_name', required=False, allow_null=True)
    
    # フロントエンドのisSavedToLibraryフィールドに対応
    isSavedToLibrary = serializers.BooleanField(source='is_saved_to_library')
    
    # コメント・いいね数を追加
    comment_count = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    
    # グッズ作成回数を追加
    goods_creation_count = serializers.IntegerField(read_only=True)
    
    def get_comment_count(self, obj):
        """コメント数を取得"""
        return obj.get_comment_count()
    
    def get_like_count(self, obj):
        """いいね数を取得"""
        return obj.get_like_count()
    
    class Meta:
        model = Library
        fields = [
            'id',  # frontend_id
            'url',  # image_url
            'displayPrompt',  # display_prompt
            'menuName',  # menu_name
            'usedFormData',  # used_form_data
            'timestamp',
            'rating',
            'isPublic',  # is_public
            'authorName',  # author_name
            'isSavedToLibrary',  # is_saved_to_library
            'comment_count',  # コメント数
            'like_count',  # いいね数
            'goods_creation_count',  # グッズ作成回数
        ]


class LibraryCreateUpdateSerializer(serializers.ModelSerializer):
    """
    タイムライン（旧ライブラリ）の作成・更新用シリアライザー
    """
    
    # フロントエンドから送信される形式に対応（frontend_idを使用）
    id = serializers.CharField(source='frontend_id')
    url = serializers.URLField(source='image_url')
    displayPrompt = serializers.CharField(source='display_prompt')
    menuName = serializers.CharField(source='menu_name', required=False, allow_null=True)
    usedFormData = serializers.JSONField(source='used_form_data')
    timestamp = serializers.DateTimeField()
    rating = serializers.CharField(required=False, allow_null=True)
    isPublic = serializers.BooleanField(source='is_public', default=False)
    authorName = serializers.CharField(source='author_name', required=False, allow_null=True)
    isSavedToLibrary = serializers.BooleanField(source='is_saved_to_library', default=False)
    
    class Meta:
        model = Library
        fields = [
            'id',  # frontend_id
            'url',  # image_url
            'displayPrompt',  # display_prompt
            'menuName',  # menu_name
            'usedFormData',  # used_form_data
            'timestamp',
            'rating',
            'isPublic',  # is_public
            'authorName',  # author_name
            'isSavedToLibrary',  # is_saved_to_library
        ]
    
    def create(self, validated_data):
        """
        タイムラインエントリを作成
        user_idはビューから自動設定される
        """
        return Library.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        """
        タイムラインエントリを更新
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance 