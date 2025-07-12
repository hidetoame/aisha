from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import OrderingFilter, SearchFilter

from api.models.menu import Menu
from api.serializers.menu import MenuSerializer


class MenuViewSet(ModelViewSet):
    queryset = Menu.objects.all()  # どのデータを対象にするか
    serializer_class = MenuSerializer
    # クエリパラメータの定義
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['category_id', 'name', 'engine', 'credit']  # 絞り込み
    ordering_fields = ['category_id', 'name', 'engine', 'credit']   # 並び替え
    search_fields = ['name', 'description', 'engine', 'prompt', 'negative_prompt',
                     'sample_input_img_url', 'sample_result_img_url']     # 部分一致検索
