from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from api.models.category import Category
from api.serializers.category import CategorySerializer


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()  # どのデータを対象にするか
    serializer_class = CategorySerializer
    # クエリパラメータの定義
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['name']  # 絞り込み
    ordering_fields = ['name', 'order_index']   # 並び替え
    search_fields = ['name']     # 部分一致検索

    @action(detail=False, methods=['post'])
    def update_order(self, request):
        """
        カテゴリの順番を更新する
        Expected request body:
        {
            "categories": [
                {"id": 1, "order_index": 0},
                {"id": 2, "order_index": 1},
                ...
            ]
        }
        """
        try:
            categories_data = request.data.get('categories', [])
            
            with transaction.atomic():
                for category_data in categories_data:
                    category_id = category_data.get('id')
                    order_index = category_data.get('order_index')
                    
                    if category_id is not None and order_index is not None:
                        Category.objects.filter(id=category_id).update(
                            order_index=order_index
                        )
            
            return Response(
                {'message': 'カテゴリの順番を更新しました'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
