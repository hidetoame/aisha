import logging

from rest_framework import serializers

from api.models.category import Category
from api.models.menu import Menu
from api.models.prompt_variable import PromptVariable

logger = logging.getLogger(__name__)


# Menuモデルに複数含まれる子モデルのSerializer
class PromptVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptVariable
        # APIリクエスト または APIレスポンス で使用するパラメータを列挙
        # write_only/read_onlyのどちらでもなければ両方に現れる可能性がある
        fields = [
            # モデルに定義は不要（Djangoが自動生成）
            'id',
            # 自モデル
            'label', 'key',
        ]


class MenuSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',  # モデル上の実フィールド名
        queryset=Category.objects.all(),
    )

    prompt_variables = PromptVariableSerializer(many=True, required=False)

    class Meta:
        model = Menu
        # APIリクエスト または APIレスポンス で使用するパラメータを列挙
        # write_only/read_onlyのどちらでもなければ両方に現れる可能性がある
        fields = [
            # モデルに定義は不要（Djangoが自動生成）
            'id',
            # 別の（独立した）APIエンドポイントの親モデル
            'category_id',  # モデル上ではなくAPI上の名前を指定
            # 自モデル
            'name', 'description', 'engine', 'prompt', 'negative_prompt', 'credit',
            'sample_input_img_url', 'sample_result_img_url',
            # 同一APIエンドポイントで扱う子モデル
            'prompt_variables',
        ]

    def create(self, validated_data, **kwargs):
        # 自モデル作成時に子モデルのパラメータが含まれないよう明示的に除外しておく
        prompt_variables_data = validated_data.pop('prompt_variables', None)

        # 自モデル作成
        menu = Menu.objects.create(**validated_data)

        # 子モデルのオブジェクト配列に対応
        for prompt_variable_data in prompt_variables_data or []:
            PromptVariable.objects.create(menu=menu, **prompt_variable_data)
        return menu

    def update(self, instance, validated_data):
        # 自モデル更新時に子モデルのパラメータが含まれないよう明示的に除外しておく
        prompt_variables_data = validated_data.pop('prompt_variables', None)

        # 自モデルを更新
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if prompt_variables_data is not None:
            # 子モデルを全て削除し、再作成する（シンプルな方法）
            instance.prompt_variables.all().delete()
            for prompt_variable_data in prompt_variables_data:
                PromptVariable.objects.create(menu=instance, **prompt_variable_data)

        return instance
