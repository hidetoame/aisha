from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from api.models.goods_management import GoodsManagement
from api.serializers.goods_management import (
    GoodsManagementSerializer,
    GoodsManagementListSerializer,
    GoodsManagementUpdateSerializer
)
from api.services.suzuri_api_service import SuzuriAPIService
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
# @permission_classes([IsAuthenticated, IsAdminUser])  # 一時的に認証を無効化
def goods_management_list(request):
    """
    グッズ管理一覧を取得
    """
    try:
        goods = GoodsManagement.objects.all()
        
        # フィルタリング
        is_public_only = request.query_params.get('public_only', '').lower() == 'true'
        needs_sub_materials = request.query_params.get('needs_sub_materials', '').lower() == 'true'
        
        logger.info(f"フィルターパラメータ: public_only={is_public_only}, needs_sub_materials={needs_sub_materials}")
        logger.info(f"フィルター前の商品数: {goods.count()}")
        
        if is_public_only:
            goods = goods.filter(is_public=True)
            logger.info(f"公開フィルター後の商品数: {goods.count()}")
        
        if needs_sub_materials:
            goods = goods.filter(needs_sub_materials=True)
            logger.info(f"sub_materialsフィルター後の商品数: {goods.count()}")
        
        serializer = GoodsManagementListSerializer(goods, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    except Exception as e:
        logger.error(f"グッズ管理一覧取得エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'グッズ管理一覧の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
# @permission_classes([IsAuthenticated, IsAdminUser])  # 一時的に認証を無効化
def goods_management_detail(request, goods_id):
    """
    グッズ管理詳細を取得
    """
    try:
        goods = get_object_or_404(GoodsManagement, id=goods_id)
        serializer = GoodsManagementSerializer(goods)
        return Response({
            'success': True,
            'data': serializer.data
        })
    except GoodsManagement.DoesNotExist:
        return Response({
            'success': False,
            'error': '指定されたグッズが見つかりません'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"グッズ管理詳細取得エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'グッズ管理詳細の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
# @permission_classes([IsAuthenticated, IsAdminUser])  # 一時的に認証を無効化
def goods_management_update(request, goods_id):
    """
    グッズ管理情報を更新
    """
    try:
        goods = get_object_or_404(GoodsManagement, id=goods_id)
        serializer = GoodsManagementUpdateSerializer(goods, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'data': GoodsManagementSerializer(goods).data
            })
        else:
            return Response({
                'success': False,
                'error': '入力データが無効です',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except GoodsManagement.DoesNotExist:
        return Response({
            'success': False,
            'error': '指定されたグッズが見つかりません'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"グッズ管理更新エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'グッズ管理の更新に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
# @permission_classes([IsAuthenticated, IsAdminUser])  # 一時的に認証を無効化
def sync_suzuri_items(request):
    """
    SUZURI APIからアイテム一覧を取得して同期
    """
    try:
        service = SuzuriAPIService()
        items = service.get_items()
        
        if not items:
            return Response({
                'success': False,
                'error': 'SUZURI APIからアイテム一覧を取得できませんでした'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        synced_count = 0
        updated_count = 0
        
        for item in items:
            # 基本価格を取得（最初のバリアントの価格）
            base_price = 0
            if item.get('variants') and len(item['variants']) > 0:
                base_price = item['variants'][0].get('price', 0)
            
            # サンプル画像URLを取得
            sample_image_url = None
            if item.get('wearingImageUrls') and item['wearingImageUrls'].get('png'):
                sample_image_url = item['wearingImageUrls']['png']
            
            # アイコンURLを取得
            icon_url = None
            if item.get('iconUrls') and item['iconUrls'].get('png'):
                icon_url = item['iconUrls']['png']
            
            # 既存のレコードを確認
            goods, created = GoodsManagement.objects.get_or_create(
                supplier='suzuri',
                suzuri_item_id=item['id'],
                defaults={
                    'item_name': item.get('name', ''),
                    'display_name': item.get('humanizeName', ''),
                    'display_order': item.get('displayOrder', 0),
                    'icon_url': icon_url,
                    'sample_image_url': sample_image_url,
                    'descriptions': [desc.lstrip() for desc in item.get('imageDescriptions', []) if desc.lstrip()],
                    'base_price': base_price,
                    'available_print_places': item.get('availablePrintPlaces', []),
                    'is_multi_printable': item.get('isMultiPrintable', False),
                    'is_public': False  # デフォルトは非公開
                }
            )
            
            if created:
                synced_count += 1
            else:
                # 既存レコードの場合は基本情報を更新（公開フラグは保持）
                goods.item_name = item.get('name', '')
                goods.display_name = item.get('humanizeName', '')
                goods.display_order = item.get('displayOrder', 0)
                goods.icon_url = icon_url
                goods.sample_image_url = sample_image_url
                goods.descriptions = [desc.lstrip() for desc in item.get('imageDescriptions', []) if desc.lstrip()]
                goods.base_price = base_price
                goods.available_print_places = item.get('availablePrintPlaces', [])
                goods.is_multi_printable = item.get('isMultiPrintable', False)
                goods.save()
                updated_count += 1
        
        return Response({
            'success': True,
            'message': f'SUZURIアイテム同期完了: 新規{synced_count}件, 更新{updated_count}件',
            'data': {
                'synced_count': synced_count,
                'updated_count': updated_count,
                'total_items': len(items)
            }
        })
        
    except Exception as e:
        logger.error(f"SUZURIアイテム同期エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'SUZURIアイテムの同期に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 


@api_view(['GET'])
# @permission_classes([IsAuthenticated, IsAdminUser])  # 一時的に認証を無効化
def public_goods_list(request):
    """
    公開グッズ一覧を取得（フロントエンド用）
    """
    try:
        # 公開フラグが立っているグッズを表示順序でソート
        goods = GoodsManagement.objects.filter(is_public=True).order_by('display_order')
        serializer = GoodsManagementListSerializer(goods, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    except Exception as e:
        logger.error(f"公開グッズ一覧取得エラー: {str(e)}")
        return Response({
            'success': False,
            'error': '公開グッズ一覧の取得に失敗しました'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 