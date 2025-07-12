from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import OrderingFilter, SearchFilter

from api.models.category import Category
from api.serializers.category import CategorySerializer


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()  # どのデータを対象にするか
    serializer_class = CategorySerializer
    # クエリパラメータの定義
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['name']  # 絞り込み
    ordering_fields = ['name']   # 並び替え
    search_fields = ['name']     # 部分一致検索
