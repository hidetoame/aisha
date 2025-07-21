from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
import logging

from api.models.menu import Menu
from api.serializers.menu import MenuSerializer

logger = logging.getLogger(__name__)


class MenuViewSet(ModelViewSet):
    queryset = Menu.objects.all()  # どのデータを対象にするか
    serializer_class = MenuSerializer
    # クエリパラメータの定義
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['category_id', 'name', 'engine', 'credit']  # 絞り込み
    ordering_fields = ['category_id', 'name', 'engine', 'credit']   # 並び替え
    search_fields = ['name', 'description', 'engine', 'prompt', 'negative_prompt',
                     'sample_input_img_url', 'sample_result_img_url']     # 部分一致検索
    
    def get_queryset(self):
        """表示順序でソートされたクエリセットを返す"""
        return Menu.objects.all().order_by('display_order', 'id')
    
    @action(detail=False, methods=['post'])
    def update_order(self, request):
        """メニューの表示順序を一括更新"""
        try:
            menu_orders = request.data.get('menu_orders', [])
            
            if not menu_orders:
                return Response(
                    {'error': 'menu_orders パラメータが必要です'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"🔄 メニュー順序更新開始: {len(menu_orders)}件")
            
            # 各メニューの表示順序を更新
            for order_data in menu_orders:
                menu_id = order_data.get('id')
                display_order = order_data.get('display_order')
                
                if menu_id is not None and display_order is not None:
                    Menu.objects.filter(id=menu_id).update(display_order=display_order)
                    logger.info(f"✅ メニューID {menu_id} の順序を {display_order} に更新")
            
            logger.info(f"✅ メニュー順序更新完了: {len(menu_orders)}件")
            
            return Response(
                {'message': f'{len(menu_orders)}件のメニュー順序を更新しました'}, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"❌ メニュー順序更新エラー: {str(e)}")
            return Response(
                {'error': 'メニュー順序の更新に失敗しました'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
