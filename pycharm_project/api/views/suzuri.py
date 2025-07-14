from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import stripe

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


@api_view(['POST'])
@csrf_exempt
def create_purchase_intent(request):
    """
    SUZURI商品の購入意図を作成（Stripe PaymentIntent）
    
    Request Body:
    {
        "product_id": "123",
        "quantity": 1,
        "size": "M",
        "color": "white",
        "user_id": "user123"
    }
    """
    try:
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        size = request.data.get('size')
        color = request.data.get('color')
        user_id = request.data.get('user_id')
        
        if not all([product_id, user_id]):
            return Response(
                {'error': 'product_id and user_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # SUZURI APIで商品詳細を取得
        suzuri_service = SuzuriAPIService()
        product = suzuri_service.get_product_detail(product_id)
        
        if not product:
            return Response(
                {'error': '商品が見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 価格計算（実際の価格はSUZURIの商品情報から取得）
        # 注意: 実際の実装では、SUZURIの価格APIを使用する必要があります
        base_price = 2500  # 仮の価格（円）
        total_amount = base_price * quantity
        
        # Stripe PaymentIntentを作成
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        payment_intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency='jpy',
            metadata={
                'product_id': product_id,
                'user_id': user_id,
                'quantity': str(quantity),
                'size': size or '',
                'color': color or '',
                'service': 'suzuri_purchase'
            },
            automatic_payment_methods={'enabled': True}
        )
        
        return Response({
            'success': True,
            'payment_intent_id': payment_intent.id,
            'client_secret': payment_intent.client_secret,
            'amount': total_amount,
            'product_info': {
                'name': product.get('title', 'SUZURI商品'),
                'price': base_price,
                'quantity': quantity,
                'size': size,
                'color': color
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Purchase intent creation error: {str(e)}")
        return Response(
            {'error': '購入準備中にエラーが発生しました'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@csrf_exempt
def confirm_purchase(request):
    """
    購入確認とSUZURI注文処理
    
    Request Body:
    {
        "payment_intent_id": "pi_xxxxx",
        "shipping_address": {
            "name": "田中太郎",
            "postal_code": "100-0001",
            "address": "東京都千代田区千代田1-1-1"
        }
    }
    """
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        shipping_address = request.data.get('shipping_address')
        
        if not payment_intent_id:
            return Response(
                {'error': 'payment_intent_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Stripe PaymentIntentを確認
        stripe.api_key = settings.STRIPE_SECRET_KEY
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status != 'succeeded':
            return Response(
                {'error': f'決済が完了していません。ステータス: {payment_intent.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # メタデータから商品情報を取得
        metadata = payment_intent.metadata
        product_id = metadata.get('product_id')
        user_id = metadata.get('user_id')
        quantity = int(metadata.get('quantity', 1))
        size = metadata.get('size')
        color = metadata.get('color')
        
        # 注意: SUZURIには直接的な注文APIが存在しないため、
        # 実際の実装では以下のような代替手段が必要です：
        # 1. SUZURIの管理画面で手動注文処理
        # 2. 外部の印刷・配送サービスとの連携
        # 3. 顧客への注文確認メール送信
        
        # 仮の注文処理（実際はSUZURIの注文システムとの統合が必要）
        order_data = {
            'order_id': f'AISHA-{payment_intent_id[-8:]}',
            'product_id': product_id,
            'user_id': user_id,
            'quantity': quantity,
            'size': size,
            'color': color,
            'shipping_address': shipping_address,
            'payment_intent_id': payment_intent_id,
            'total_amount': payment_intent.amount,
            'status': 'processing'
        }
        
        # データベースに注文を保存（実装が必要）
        # Order.objects.create(**order_data)
        
        logger.info(f"Order created: {order_data}")
        
        return Response({
            'success': True,
            'order_id': order_data['order_id'],
            'message': '注文を受け付けました。商品の準備が整い次第、発送いたします。',
            'estimated_delivery': '7-14営業日'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Purchase confirmation error: {str(e)}")
        return Response(
            {'error': '注文処理中にエラーが発生しました'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
