import logging

from rest_framework import serializers

logger = logging.getLogger(__name__)


# 出力用SerializerにはViewでinstance=...で渡す
# バリデーションではなく必要なパラメータのみ取り出すためのSerializer
class MenuExecutionResponseSerializer(serializers.Serializer):
    generatedImageUrl = serializers.URLField(source="image_presigned_url_1")
    promptFormatted = serializers.CharField(source="prompt_formatted")  # 統合APIではなくこのAPIで生成・追加
    createdAt = serializers.DateTimeField(source="created_at")  # 名前が同じ時にsource=を指定するとRedundant Errorになるので指定しない
