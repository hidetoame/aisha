import logging

from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.menu import Menu
from api.serializers.menu_execution.request import MenuExecutionRequestSerializer
from api.serializers.menu_execution.response import MenuExecutionResponseSerializer
from api.services.tsukuruma_api_execution import generate_or_edit

logger = logging.getLogger(__name__)


class MenuExecutionView(APIView):
    # NOTE menu_idはURLから取得
    def post(self, request, menu_id):
        # 指定されたIDのMenuモデルのインスタンスを取得
        instance = get_object_or_404(Menu, pk=menu_id)

        # リクエストパラメータ取得
        serializer = MenuExecutionRequestSerializer(data=request.data, context={"menu_id": menu_id})
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        logger.info(f"request parameters: {validated_data}")

        # ビジネスロジック
        result, prompt_formatted = generate_or_edit(instance, **validated_data)

        # レスポンスパラメータ整形
        if result.success:
            response_data = {**result.data, "prompt_formatted": prompt_formatted}
            response_data = MenuExecutionResponseSerializer(instance=response_data).data
        else:
            response_data = {"error": result.error}
        logger.info(f"response data: {response_data}")

        return Response(data=response_data, status=result.status_code)
