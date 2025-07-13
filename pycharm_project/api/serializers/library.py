from rest_framework import serializers
from api.models.library import Library
from datetime import datetime


class LibrarySerializer(serializers.ModelSerializer):
    """
    ライブラリのシリアライザー
    フロントエンドのGeneratedImage型との相互変換を行う
    """
    
    # フロントエンドのidフィールドに対応
    id = serializers.CharField(source='frontend_id', read_only=True)
    
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
        ]


class LibraryCreateUpdateSerializer(serializers.ModelSerializer):
    """
    ライブラリの作成・更新用シリアライザー
    """
    
    # フロントエンドから送信される形式に対応
    id = serializers.CharField(source='frontend_id')
    url = serializers.URLField(source='image_url')
    displayPrompt = serializers.CharField(source='display_prompt')
    menuName = serializers.CharField(source='menu_name', required=False, allow_null=True)
    usedFormData = serializers.JSONField(source='used_form_data')
    timestamp = serializers.DateTimeField()
    rating = serializers.CharField(required=False, allow_null=True)
    isPublic = serializers.BooleanField(source='is_public', default=False)
    authorName = serializers.CharField(source='author_name', required=False, allow_null=True)
    
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
        ]
    
    def create(self, validated_data):
        """
        ライブラリエントリを作成
        user_idはビューから自動設定される
        """
        return Library.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        """
        ライブラリエントリを更新
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance 