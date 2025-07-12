import logging

from rest_framework import serializers

logger = logging.getLogger(__name__)


# 出力用SerializerにはViewでinstance=...で渡す
# バリデーションではなく必要なパラメータのみ取り出すためのSerializer
class MenuExecutionResponseSerializer(serializers.Serializer):
    generated_image_url = serializers.URLField(source="image_presigned_url_1")
    prompt_formatted = serializers.CharField()  # 統合APIではなくこのAPIで生成・追加
    created_at = serializers.DateTimeField()  # 名前が同じ時にsource=を指定するとRedundant Errorになるので指定しない
