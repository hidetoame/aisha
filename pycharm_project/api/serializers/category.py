from rest_framework import serializers

from api.models.category import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        # APIリクエスト または APIレスポンス で使用するパラメータを列挙
        # write_only/read_onlyのどちらでもなければ両方に現れる可能性がある
        fields = [
            # モデルに定義は不要（Djangoが自動生成）
            'id',
            # 自モデル
            'name', 'description', 'order_index'
        ]
