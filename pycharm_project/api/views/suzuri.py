from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

from api.services.suzuri_api_service import SuzuriAPIService

logger = logging.getLogger(__name__)


@api_view(['POST'])
@csrf_exempt
# @permission_classes([IsAuthenticated])  # 一時的に認証を無効化
def create_merchandise(request):
    """
    生成画像からSUZURIでグッズを作成
    
    Request Body:
    {
        "image_url": "https://example.com/image.jpg",
        "car_name": "NISSAN FAIRLADY Z",
        "description": "オプション説明"
    }
    """
    try:
        image_url = request.data.get('image_url')
        car_name = request.data.get('car_name')
        description = request.data.get('description', '')
        
        if not image_url:
            return Response(
                {'error': '画像URLが必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not car_name:
            return Response(
                {'error': '車名が必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # SUZURI API サービスを初期化
        suzuri_service = SuzuriAPIService()
        
        # グッズ作成を実行
        result = suzuri_service.create_car_merchandise(
            image_url=image_url,
            car_name=car_name,
            description=description
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'グッズの作成が完了しました',
                'product_url': result['product_url'],
                'product_id': result['product']['id'],
                'product_title': result['product']['title']
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Merchandise creation error: {str(e)}")
        return Response(
            {'error': 'グッズ作成中にエラーが発生しました'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@csrf_exempt
# @permission_classes([IsAuthenticated])  # 一時的に認証を無効化
def get_available_items(request):
    """
    SUZURI で利用可能なアイテム一覧を取得
    """
    try:
        suzuri_service = SuzuriAPIService()
        items = suzuri_service.get_items()
        
        if items is not None:
            return Response({
                'success': True,
                'items': items
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': 'アイテム一覧の取得に失敗しました'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Get items error: {str(e)}")
        return Response(
            {'error': 'アイテム一覧の取得中にエラーが発生しました'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@csrf_exempt
# @permission_classes([IsAuthenticated])  # 一時的に認証を無効化
def get_user_products(request):
    """
    ユーザーのSUZURI商品一覧を取得
    """
    try:
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 20))
        
        suzuri_service = SuzuriAPIService()
        result = suzuri_service.get_user_products(page=page, per_page=per_page)
        
        if result is not None:
            return Response({
                'success': True,
                'products': result.get('products', []),
                'pagination': {
                    'current_page': page,
                    'per_page': per_page,
                    'total_count': result.get('meta', {}).get('totalCount', 0)
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': '商品一覧の取得に失敗しました'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Get user products error: {str(e)}")
        return Response(
            {'error': '商品一覧の取得中にエラーが発生しました'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@csrf_exempt
# @permission_classes([IsAuthenticated])  # 一時的に認証を無効化
def get_product_detail(request, product_id):
    """
    SUZURI商品の詳細情報を取得
    """
    try:
        suzuri_service = SuzuriAPIService()
        product = suzuri_service.get_product_detail(product_id)
        
        if product is not None:
            return Response({
                'success': True,
                'product': product
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': '商品詳細の取得に失敗しました'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Get product detail error: {str(e)}")
        return Response(
            {'error': '商品詳細の取得中にエラーが発生しました'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
