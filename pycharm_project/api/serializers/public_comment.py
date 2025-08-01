from rest_framework import serializers
from api.models import PublicComment


class PublicCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicComment
        fields = ['id', 'frontend_id', 'content', 'author_name', 'created_at']
        read_only_fields = ['id', 'created_at']