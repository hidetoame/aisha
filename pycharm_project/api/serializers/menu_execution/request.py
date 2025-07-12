import logging

from rest_framework import serializers

from api.models.menu import Menu
from api.serializers.custom_fields.json_list_field import JSONListField

logger = logging.getLogger(__name__)


# MenuExecution APIのリクエストパラメータに複数含まれる子パラメータSerializer
class PromptVariableRequestSerializer(serializers.Serializer):
    key = serializers.CharField(max_length=255)
    value = serializers.CharField()


# NOTE メニューIDはURLパラメータで受け取る
# 入力用SerializerにはViewでdata=...で渡す
class MenuExecutionRequestSerializer(serializers.Serializer):
    image = serializers.ImageField(default=None, required=False, allow_empty_file=False)
    additional_prompt_for_my_car = serializers.CharField(default=None, required=False)
    additional_prompt_for_others = serializers.CharField(default=None, required=False)
    aspect_ratio = serializers.CharField(default=None, required=False, max_length=16)
    prompt_variables = JSONListField(
        child=PromptVariableRequestSerializer(),
        default=[],
        required=False,
        allow_empty=True,
    )

    def validate(self, data):
        # URLパラメータから（Viewで指定した）menu_idを取得
        menu_id = self.context.get("menu_id")
        if not menu_id:
            raise serializers.ValidationError("menu_idがURLに含まれていません。")
        # 指定されたmenu_idがDBに存在するか確認
        try:
            # この後prompt_variablesにのみアクセスするので、効率化のためprefetch_relatedに指定
            menu = Menu.objects.prefetch_related("prompt_variables").get(id=menu_id)
        except Menu.DoesNotExist:
            raise serializers.ValidationError(f"Menu ID {menu_id} がDBに存在しません。")
        # Menuに紐づく全てのprompt_variable.keyを取得
        required_keys = {prompt_variable.key for prompt_variable in menu.prompt_variables.all()}
        # リクエストから送られた key を取得
        provided_keys = {prompt_variable["key"] for prompt_variable in data.get("prompt_variables", [])}
        # keyが不足しているか判定
        missing_keys = required_keys - provided_keys
        if missing_keys:
            raise serializers.ValidationError({
                "prompt_variables": f"次のkeyが不足しています: {', '.join(missing_keys)}"
            })

        return data
