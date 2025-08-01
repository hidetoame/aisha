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
        # リクエストデータを取得
        image_url = request.data.get('image_url')
        car_name = request.data.get('car_name', 'AISHA生成画像')
        description = request.data.get('description', '')
        item_type = request.data.get('item_type', 'heavyweight-t-shirt')
        item_id = request.data.get('item_id')  # SUZURIアイテムIDを直接取得
        user_id = request.data.get('user_id')
        additional_profit = request.data.get('additional_profit', 0)  # 追加利益
        print_places = request.data.get('print_places', [])  # プリント位置
        is_multi_printable = request.data.get('is_multi_printable', False)  # マルチプリント可能フラグ
        
        logger.info(f"SUZURI merchandise creation request:")
        logger.info(f"  image_url: {image_url}")
        logger.info(f"  car_name: {car_name}")
        logger.info(f"  description: {description}")
        logger.info(f"  item_type: {item_type}")
        logger.info(f"  item_id: {item_id}")
        logger.info(f"  user_id: {user_id}")
        logger.info(f"  additional_profit: {additional_profit}")
        logger.info(f"  print_places: {print_places}")
        logger.info(f"  is_multi_printable: {is_multi_printable}")
        
        if not image_url:
            logger.error("❌ 画像URLが未設定")
            return Response(
                {'error': '画像URLが必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not car_name:
            logger.error("❌ 車名が未設定")
            return Response(
                {'error': '車名が必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 画像URLはそのまま使用（アクセス可能であることを確認済み）
        public_image_url = image_url
        
        # SUZURI API サービスを初期化
        try:
            suzuri_service = SuzuriAPIService()
            logger.info("✅ SuzuriAPIService 初期化成功")
        except ValueError as e:
            logger.error(f"❌ SuzuriAPIService 初期化失敗: {str(e)}")
            return Response({
                'success': False,
                'error': f'SUZURI APIの設定エラー: {str(e)}',
                'detail': 'SUZURI_API_TOKEN環境変数を設定してください'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # グッズ作成を実行（署名付きURLを使用）
        logger.info(f"🛠️ グッズ作成開始:")
        logger.info(f"  📸 Image URL: {public_image_url}")
        logger.info(f"  🚗 Car Name: {car_name}")
        logger.info(f"  📝 Description: {description}")
        
        result = suzuri_service.create_car_merchandise(
            image_url=public_image_url,  # 署名付きURLまたはオリジナルURL
            car_name=car_name,
            description=description,
            item_type=item_type,  # アイテム種類を渡す
            item_id=item_id,  # SUZURIアイテムIDを直接渡す
            additional_profit=additional_profit,  # 追加利益を渡す
            print_places=print_places,  # プリント位置を渡す
            is_multi_printable=is_multi_printable  # マルチプリント可能フラグを渡す
        )
        
        logger.info(f"🔍 SUZURI service result: {result}")
        
        if result['success']:
            logger.info(f"✅ SUZURI merchandise creation successful:")
            logger.info(f"  product_url: {result.get('product_url')}")
            
            product = result.get('product', {})
            logger.info(f"  product_id: {product.get('id')}")
            logger.info(f"  product_title: {product.get('title')}")
            logger.info(f"  sample_url: {product.get('sampleUrl')}")
            logger.info(f"  sample_image_url: {product.get('sampleImageUrl')}")
            
            # グッズ作成成功時にLibraryのグッズ作成回数をインクリメント
            library_entry = None
            try:
                from api.models.library import Library
                from django.db.models import F
                
                # image_urlに一致するLibraryエントリを検索してカウントを増加
                updated_count = Library.objects.filter(
                    image_url=public_image_url
                ).update(goods_creation_count=F('goods_creation_count') + 1)
                
                if updated_count > 0:
                    logger.info(f"✅ グッズ作成回数を更新: {updated_count}件のライブラリエントリ")
                    # 履歴記録用にLibraryエントリを取得
                    library_entry = Library.objects.filter(image_url=public_image_url).first()
                else:
                    logger.warning(f"⚠️ 画像URLに一致するライブラリエントリが見つかりません: {public_image_url}")
                    
            except Exception as e:
                logger.error(f"❌ グッズ作成回数更新エラー: {str(e)}")
            
            # SUZURIグッズ作成履歴を記録
            try:
                from api.models.suzuri_merchandise import SuzuriMerchandise
                
                # 必要なデータを準備
                goods_creator_user_id = user_id or 'anonymous'  # グッズを作った人のID
                original_image_creator_user_id = library_entry.user_id if library_entry else 'unknown'  # 元画像を生成した人のID
                library_image_id = library_entry.id if library_entry else None  # ライブラリ画像ID
                
                # SUZURIからの結果
                product_id = product.get('id', 0)
                material_id = result.get('material', {}).get('id', 0)
                product_title = product.get('title', '')
                product_url = product.get('sampleUrl', result.get('product_url', ''))
                sample_image_url = product.get('sampleImageUrl', '')
                item_name = result.get('item', {}).get('name', item_type)
                item_id = result.get('item', {}).get('id', 0)
                
                # 重複チェック: 同じ画像URL + 同じアイテムタイプの組み合わせが存在するか
                existing_merchandise = SuzuriMerchandise.objects.filter(
                    original_image_url=public_image_url,
                    item_name=item_name,
                    goods_creator_user_id=goods_creator_user_id
                ).first()
                
                if existing_merchandise:
                    # 既存のレコードを更新
                    existing_merchandise.product_id = product_id
                    existing_merchandise.material_id = material_id
                    existing_merchandise.product_title = product_title
                    existing_merchandise.product_url = product_url
                    existing_merchandise.sample_image_url = sample_image_url
                    existing_merchandise.car_name = car_name
                    existing_merchandise.description = description
                    existing_merchandise.item_id = item_id
                    existing_merchandise.save()
                    
                    merchandise = existing_merchandise
                    logger.info(f"✅ SUZURI グッズ履歴を更新（重複回避）:")
                    logger.info(f"  既存履歴ID: {merchandise.id}")
                    logger.info(f"  グッズ作成者: {goods_creator_user_id}")
                    logger.info(f"  元画像作成者: {original_image_creator_user_id}")
                    logger.info(f"  ライブラリ画像ID: {library_image_id}")
                    logger.info(f"  商品ID: {product_id}")
                    logger.info(f"  商品タイトル: {product_title}")
                else:
                    # 新しいレコードを作成
                    merchandise = SuzuriMerchandise.objects.create(
                        goods_creator_user_id=goods_creator_user_id,
                        original_image_creator_user_id=original_image_creator_user_id,
                        library_image_id=library_image_id,
                        frontend_user_id=user_id or '',  # 後方互換性
                        product_id=product_id,
                        material_id=material_id,
                        product_title=product_title,
                        product_url=product_url,
                        sample_image_url=sample_image_url,
                        original_image_url=public_image_url,
                        car_name=car_name,
                        description=description,
                        item_name=item_name,
                        item_id=item_id
                    )
                    logger.info(f"✅ SUZURI グッズ履歴を新規作成:")
                    logger.info(f"  履歴ID: {merchandise.id}")
                    logger.info(f"  グッズ作成者: {goods_creator_user_id}")
                    logger.info(f"  元画像作成者: {original_image_creator_user_id}")
                    logger.info(f"  ライブラリ画像ID: {library_image_id}")
                    logger.info(f"  商品ID: {product_id}")
                    logger.info(f"  商品タイトル: {product_title}")
                
            except Exception as e:
                logger.error(f"❌ SUZURI グッズ履歴記録エラー: {str(e)}")
                import traceback
                logger.error(f"❌ エラー詳細: {traceback.format_exc()}")
            
            return Response({
                'success': True,
                'message': 'グッズの作成が完了しました',
                'product_url': product.get('sampleUrl', result.get('product_url')),  # sampleUrlを優先
                'product_id': product.get('id'),
                'product_title': product.get('title'),
                'sample_image_url': product.get('sampleImageUrl'),  # プレビュー画像URL追加
                'item_name': result.get('item', {}).get('name'),
                'material_id': result.get('material', {}).get('id')
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"❌ SUZURI merchandise creation failed:")
            logger.error(f"  error: {result.get('error')}")
            
            return Response({
                'success': False,
                'error': result.get('error')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"💥 Merchandise creation exception: {str(e)}")
        logger.error(f"💥 Exception type: {type(e)}")
        import traceback
        logger.error(f"💥 Traceback: {traceback.format_exc()}")
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


@api_view(['GET'])
@csrf_exempt
def get_goods_by_image(request, frontend_id):
    """
    特定画像から作成されたグッズ一覧を取得（重複排除・最新のみ）
    
    Parameters:
    - frontend_id: 画像のfrontend_id
    
    Response:
    [
        {
            "id": 1,
            "product_id": 73698227,
            "product_title": "車の画像 Tシャツ",
            "product_url": "https://suzuri.jp/AISHA/...",
            "sample_image_url": "https://example.com/sample.jpg",
            "item_name": "heavyweight-t-shirt",
            "created_at": "2024-01-01T12:00:00Z"
        }
    ]
    """
    try:
        from api.models import Library
        from api.models.suzuri_merchandise import SuzuriMerchandise
        
        # frontend_idからLibraryを取得
        library = Library.objects.filter(frontend_id=frontend_id, is_public=True).first()
        
        if not library:
            return Response(
                {'error': '画像が見つかりません'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        logger.info(f"📦 画像のグッズ取得 - frontend_id: {frontend_id}, library_id: {library.id}")
        
        # その画像から作成されたグッズを取得
        # 同じitem_nameの中で最新のものだけを取得
        from django.db.models import Max
        
        # まず各item_nameごとの最新のcreated_atを取得
        latest_items = SuzuriMerchandise.objects.filter(
            library_image_id=library.id
        ).values('item_name').annotate(
            latest_created=Max('created_at')
        )
        
        # 最新のグッズのみを取得
        goods_list = []
        for item in latest_items:
            goods = SuzuriMerchandise.objects.filter(
                library_image_id=library.id,
                item_name=item['item_name'],
                created_at=item['latest_created']
            ).first()
            
            if goods:
                goods_list.append({
                    'id': goods.id,
                    'product_id': goods.product_id,
                    'product_title': goods.product_title,
                    'product_url': goods.product_url,
                    'sample_image_url': goods.sample_image_url,
                    'item_name': goods.item_name,
                    'item_id': goods.item_id,
                    'created_at': goods.created_at.isoformat()
                })
        
        # 作成日時の新しい順にソート
        goods_list.sort(key=lambda x: x['created_at'], reverse=True)
        
        logger.info(f"📦 グッズ {len(goods_list)} 件取得")
        
        return Response({
            'success': True,
            'goods': goods_list
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"画像のグッズ取得エラー: {str(e)}", exc_info=True)
        return Response(
            {'error': 'グッズ一覧の取得中にエラーが発生しました'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@csrf_exempt
def get_user_goods_history(request):
    """
    ユーザーのSUZURIグッズ作成履歴を取得
    
    Query Parameters:
    - user_id: ユーザーID（Firebase UID）
    
    Response:
    [
        {
            "id": 1,
            "product_id": 73698227,
            "product_title": "車の画像 Tシャツ",
            "product_url": "https://suzuri.jp/AISHA/...",
            "sample_image_url": "https://example.com/sample.jpg",
            "original_image_url": "https://example.com/original.jpg",
            "car_name": "NISSAN FAIRLADY Z",
            "description": "...",
            "item_name": "heavyweight-t-shirt",
            "created_at": "2024-01-01T12:00:00Z",
            "library_image_id": "uuid-string"
        }
    ]
    """
    try:
        user_id = request.GET.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id パラメータが必要です'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"📦 グッズ履歴取得 - user_id: {user_id}")
        
        # SuzuriMerchandiseモデルをインポート
        from api.models.suzuri_merchandise import SuzuriMerchandise
        
        # ユーザーのグッズ履歴を取得（作成日降順）
        goods_history = SuzuriMerchandise.objects.filter(
            goods_creator_user_id=user_id
        ).order_by('-created_at')
        
        # レスポンスデータを構築
        history_data = []
        for goods in goods_history:
            history_data.append({
                'id': goods.id,
                'product_id': goods.product_id,
                'product_title': goods.product_title,
                'product_url': goods.product_url,
                'sample_image_url': goods.sample_image_url,
                'original_image_url': goods.original_image_url,
                'car_name': goods.car_name,
                'description': goods.description,
                'item_name': goods.item_name,
                'created_at': goods.created_at.isoformat(),
                'library_image_id': str(goods.library_image_id),
                'material_id': goods.material_id,
                'item_id': goods.item_id,
            })
        
        logger.info(f"✅ グッズ履歴取得成功 - 件数: {len(history_data)}")
        
        return Response(history_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ グッズ履歴取得エラー: {str(e)}")
        return Response(
            {'error': 'グッズ履歴の取得に失敗しました'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
