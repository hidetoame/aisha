import os
import requests
import json
from typing import Dict, List, Optional, Any
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class SuzuriAPIService:
    """
    SUZURI API との連携を行うサービスクラス
    """
    
    def __init__(self):
        self.api_token = os.getenv('SUZURI_API_TOKEN')
        self.base_url = os.getenv('SUZURI_API_BASE_URL', 'https://suzuri.jp/api/v1')
        
        # デモモードかどうかを確認
        self.demo_mode = os.getenv('SUZURI_DEMO_MODE', 'false').lower() == 'true'
        
        # APIトークンの存在確認（デモモードでない場合）
        if not self.demo_mode and not self.api_token:
            logger.error("SUZURI_API_TOKEN環境変数が設定されていません")
            raise ValueError("SUZURI_API_TOKEN環境変数が設定されていません")
        
        self.headers = {
            'Authorization': f'Bearer {self.api_token or "demo_token"}',
            'Content-Type': 'application/json',
            'User-Agent': 'AISHA-CarImageGenerator/1.0'
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, files: Optional[Dict] = None) -> Optional[Dict]:
        """
        SUZURI API にリクエストを送信する共通メソッド
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            headers = self.headers.copy()
            if files:
                # ファイルアップロードの場合はContent-Typeを削除
                headers.pop('Content-Type', None)
            
            # デバッグログ
            logger.info(f"SUZURI API リクエスト準備: {method} {url}")
            logger.info(f"Headers: {headers}")
            if data and len(str(data)) < 500:  # 大きなデータの場合は省略
                logger.info(f"Data: {data}")
            elif data:
                logger.info(f"Data size: {len(str(data))} characters (省略)")
            
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data if not files else None,
                files=files,
                timeout=30
            )
            
            logger.info(f"SUZURI API {method} {url} - Status: {response.status_code}")
            
            if response.status_code in [200, 201, 204]:
                result = response.json() if response.content else {}
                
                # デバッグ: レスポンス内容をログ出力
                if '/materials' in url and method == 'POST':
                    logger.info(f"Materials API レスポンス: {result}")
                    logger.info(f"利用可能なキー: {list(result.keys()) if isinstance(result, dict) else 'レスポンスが辞書ではありません'}")
                
                return result
            else:
                error_detail = response.text
                logger.error(f"SUZURI API Error: {response.status_code} - {error_detail}")
                
                # エラーの詳細を取得
                try:
                    error_json = response.json()
                    if 'error' in error_json:
                        error_detail = error_json['error']
                    elif 'message' in error_json:
                        error_detail = error_json['message']
                    elif 'errors' in error_json:
                        error_detail = str(error_json['errors'])
                except:
                    pass
                
                # カスタムエラーメッセージを返す
                return {
                    'error': True,
                    'status_code': response.status_code,
                    'message': error_detail,
                    'endpoint': url
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"SUZURI API Request Failed: {str(e)}")
            return None
    
    def get_items(self) -> Optional[List[Dict]]:
        """
        利用可能なアイテム一覧を取得
        """
        result = self._make_request('GET', '/items')
        return result.get('items', []) if result else None
    
    def upload_material_from_url(self, image_url: str, title: str) -> Optional[Dict]:
        """
        URLから画像をダウンロードしてマテリアルとしてアップロード
        
        Args:
            image_url: ダウンロードする画像のURL
            title: マテリアルのタイトル
            
        Returns:
            アップロードされたマテリアルの情報
        """
        try:
            # 画像をダウンロード
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # ファイル形式を判定
            content_type = response.headers.get('content-type', 'image/png')
            if 'image/jpeg' in content_type or 'image/jpg' in content_type:
                file_extension = 'jpg'
                mime_type = 'image/jpeg'
            else:
                file_extension = 'png'
                mime_type = 'image/png'
            
            # Base64エンコード
            import base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')
            
            # JSONペイロード（マテリアルのみ作成）
            data = {
                'title': title,
                'texture': f'data:{mime_type};base64,{image_base64}'
            }
            
            logger.info(f"SUZURI マテリアル作成開始: title={title}, size={len(response.content)} bytes")
            result = self._make_request('POST', '/materials', data=data)
            
            if result and 'material' in result:
                logger.info(f"✅ マテリアル作成成功: material_id={result['material'].get('id')}")
                return result['material']
            elif result:
                # 'material'キーがない場合、結果全体を返す
                logger.info(f"✅ マテリアル作成成功（異なる形式）: {result}")
                return result
            else:
                logger.error("❌ マテリアル作成に失敗しました")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download image from {image_url}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Material creation failed: {str(e)}")
            return None

    def upload_material_and_create_product(self, image_url: str, title: str, item_id: int, description: str = "", price: int = 1000) -> Optional[Dict]:
        """
        URL から画像をダウンロードして、マテリアルと商品を同時に作成
        
        Args:
            image_url: ダウンロードする画像のURL
            title: マテリアル・商品のタイトル
            item_id: アイテムID（148: Tシャツなど）
            description: 商品説明
            price: 商品利益額（デフォルト1000円）
        """
        try:
            # 画像をダウンロード
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # ファイル形式を判定
            content_type = response.headers.get('content-type', 'image/png')
            if 'image/jpeg' in content_type or 'image/jpg' in content_type:
                file_extension = 'jpg'
                mime_type = 'image/jpeg'
            else:
                file_extension = 'png'
                mime_type = 'image/png'
            
            # Base64エンコード
            import base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')
            
            # JSONペイロード（マテリアル + 商品を同時作成）
            data = {
                'title': title,
                'texture': f'data:{mime_type};base64,{image_base64}',
                'description': description,
                'price': price,
                'products': [
                    {
                        'itemId': item_id,
                        'published': True
                    }
                ]
            }
            
            logger.info(f"SUZURI マテリアル+商品作成開始: title={title}, itemId={item_id}, size={len(response.content)} bytes")
            result = self._make_request('POST', '/materials', data=data)
            
            if result and 'material' in result:
                logger.info(f"✅ マテリアル+商品作成成功: material_id={result['material'].get('id')}")
                
                # 作成された商品情報を取得
                products = result.get('products', [])
                if products:
                    logger.info(f"✅ 商品も同時作成成功: {len(products)}個の商品")
                    return {
                        'material': result['material'],
                        'products': products,
                        'success': True
                    }
                else:
                    logger.warning("⚠️ マテリアル作成成功だが商品が作成されませんでした")
                    return {
                        'material': result['material'],
                        'products': [],
                        'success': True
                    }
            else:
                logger.error("❌ マテリアル作成に失敗しました")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download image from {image_url}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Material+Product creation failed: {str(e)}")
            return None
    
    def create_product(self, material_id: int, item_id: int, title: str, description: str = "", exemplary_item_variant_id: Optional[int] = None) -> Optional[Dict]:
        """
        商品を作成
        
        Args:
            material_id: マテリアルID
            item_id: アイテムID（1: Tシャツなど）
            title: 商品タイトル
            description: 商品説明
            exemplary_item_variant_id: 代表的なアイテムバリアントID
        """
        # 複数のエンドポイント形式を試す
        endpoints_to_try = [
            '/products',
            f'/materials/{material_id}/products',
            '/items/products',
            f'/items/{item_id}/products'
        ]
        
        # 複数のデータ形式を試す
        data_formats = [
            # 形式1: 現在の形式
            {
                'title': title,
                'description': description,
                'published': True,
                'product': {
                    'materialId': material_id,
                    'itemId': item_id
                }
            },
            # 形式2: フラット形式
            {
                'title': title,
                'description': description,
                'published': True,
                'materialId': material_id,
                'itemId': item_id
            },
            # 形式3: 異なるキー名
            {
                'title': title,
                'description': description,
                'published': True,
                'material_id': material_id,
                'item_id': item_id
            }
        ]
        
        for endpoint in endpoints_to_try:
            for i, data in enumerate(data_formats):
                logger.info(f"商品作成試行: エンドポイント={endpoint}, データ形式={i+1}")
                
                if exemplary_item_variant_id:
                    if 'product' in data:
                        data['product']['exemplaryItemVariantId'] = exemplary_item_variant_id
                    else:
                        data['exemplaryItemVariantId'] = exemplary_item_variant_id
                
                result = self._make_request('POST', endpoint, data=data)
                if result is not None:
                    logger.info(f"✅ 商品作成成功: エンドポイント={endpoint}, データ形式={i+1}")
                    return result
                else:
                    logger.warning(f"❌ 商品作成失敗: エンドポイント={endpoint}, データ形式={i+1}")
        
        logger.error("すべての商品作成方法が失敗しました")
        return None
    
    def _get_item_display_name(self, item_name: str, requested_type: str) -> str:
        """
        アイテム名から表示用の名前を取得
        """
        display_names = {
            'dry-t-shirt': 'ドライTシャツ',
            'smartphone-case': 'iPhoneケース',
            'iphone-case': 'iPhoneケース',
            'phone-case': 'iPhoneケース',
            'big-shoulder-bag': 'ショルダーバッグ',
            'shoulder-bag': 'ショルダーバッグ',
            'thermo-tumbler': 'タンブラー',
            'tumbler': 'タンブラー',
            'sticker': 'ステッカー',
            'clear-file-folder': 'クリアファイル',
            'clear-file': 'クリアファイル',
            'file-folder': 'クリアファイル',
        }
        
        # requested_typeから優先的に表示名を取得
        if requested_type in display_names:
            return display_names[requested_type]
        
        # item_nameから表示名を取得
        if item_name in display_names:
            return display_names[item_name]
        
        # マッピングにない場合はそのまま返す
        return item_name or 'グッズ'

    def create_car_merchandise(self, image_url: str, car_name: str, description: str = "", item_type: str = "heavyweight-t-shirt", item_id: int = None, additional_profit: int = 0, print_places: List[str] = None, is_multi_printable: bool = False) -> Dict[str, Any]:
        """
        車の画像からグッズを作成する統合メソッド（Zennのベストプラクティスに基づく実装）
        
        Args:
            image_url: 車の画像URL
            car_name: 車の名前
            description: 商品説明
            item_type: 作成するアイテムの種類（例: heavyweight-t-shirt, heavyweight-hoodie）
            
        Returns:
            作成結果の辞書（成功/失敗、作成された商品情報など）
        """
        
        # 管理画面のデータベースからAPI設定を取得
        try:
            from api.models.goods_management import GoodsManagement
            goods_config = GoodsManagement.objects.filter(
                suzuri_item_id=item_id,
                is_public=True
            ).first()
            
            if goods_config:
                # データベースからitem_typeとapi_configを取得
                item_type = goods_config.item_type
                api_config = goods_config.api_config or {}
                logger.info(f"📋 管理画面から取得した設定: item_type={item_type}, api_config={api_config}")
            else:
                api_config = {}
                logger.info(f"⚠️ 管理画面に設定が見つかりません: item_id={item_id}")
        except Exception as e:
            logger.warning(f"管理画面からの設定取得に失敗: {str(e)}")
            api_config = {}
        
        # フロントエンドのitem_typeとSUZURI APIアイテム名のマッピング
        item_type_mapping = {
            'dry-t-shirt': ['dry-t-shirt', 'dry-t', 'ドライTシャツ', 'ドライT', 'dry', 'dri-fit'],
            'smartphone-case': ['smartphone-case', 'phone-case', 'iphone-case', 'iphoneケース', 'スマホケース', 'ケース'],
            'big-shoulder-bag': ['big-shoulder-bag', 'shoulder-bag', 'ショルダーバッグ', 'ショルダー', 'shoulder'],
            'thermo-tumbler': ['thermo-tumbler', 'tumbler', 'タンブラー', 'サーモ', 'thermo'],
            'sticker': ['sticker', 'ステッカー', 'シール'],
            'clear-file-folder': ['clear-file-folder', 'clear-file', 'file-folder', 'クリアファイル', 'ファイル'],
        }
        
        try:
            # デモモードの場合は、デモレスポンスを返す
            if self.demo_mode:
                logger.info("デモモードでSUZURIグッズ作成をシミュレート")
                # 追加利益が指定されている場合はそれを使用、そうでなければデフォルト値
                demo_profit = additional_profit if additional_profit > 0 else 1000
                demo_price = 2500 + demo_profit  # ベース価格 + 利益
                
                return {
                    'success': True,
                    'product': {
                        'id': 12345,
                        'title': f"{car_name} ドライTシャツ",
                        'description': description or f"AISHA で生成された {car_name} の画像を使用したオリジナルドライTシャツです。",
                        'price': demo_price,  # ベース価格 + 追加利益
                        'profit': demo_profit,  # 利益額
                        'created_at': '2024-01-01T12:00:00Z',
                        'sampleUrl': f"https://suzuri.jp/products/demo-{car_name.lower().replace(' ', '-')}",
                        'sampleImageUrl': image_url
                    },
                    'material': {
                        'id': 67890,
                        'title': f"{car_name} - 生成画像",
                        'url': image_url
                    },
                    'item': {
                        'id': 148,
                        'name': 'dry-t-shirt',
                        'base_price': 2500
                    },
                    'product_url': f"https://suzuri.jp/products/demo-{car_name.lower().replace(' ', '-')}"
                }
            
            # item_idが指定されている場合は直接使用、指定されていない場合は検索処理
            target_item = None
            if item_id is not None:
                # item_idが指定されている場合は、そのIDのアイテムを直接使用
                logger.info(f"指定されたitem_idを使用: {item_id}")
                target_item = {
                    'id': item_id,
                    'name': item_type,  # フロントエンドから送信されたitem_typeを使用
                }
            else:
                # 従来の検索処理（後方互換性のため）
                logger.info("item_idが指定されていないため、従来の検索処理を実行")
                
                # 1. アイテム一覧を取得して指定されたアイテムを探す
                items = self.get_items()
                if not items:
                    return {'success': False, 'error': 'アイテム一覧の取得に失敗しました'}
                
                # エラーレスポンスかどうかを確認
                if isinstance(items, dict) and items.get('error'):
                    return {
                        'success': False, 
                        'error': f'SUZURI API エラー: {items.get("message", "不明なエラー")}'
                    }
                
                # 指定されたアイテムを探す
                logger.info(f"取得したアイテム数: {len(items)}")
                logger.info(f"検索対象アイテム: {item_type}")
                
                # マッピングテーブルから検索キーワードを取得
                search_keywords = item_type_mapping.get(item_type, [item_type])
                logger.info(f"検索キーワード: {search_keywords}")
                
                for item in items:
                    item_name = item.get('name', '').lower()
                    logger.info(f"アイテム検索中: ID={item.get('id')}, Name='{item.get('name')}', Lower='{item_name}'")
                    
                    # マッピングテーブルのキーワードと照合
                    for keyword in search_keywords:
                        if item_name == keyword.lower() or keyword.lower() in item_name:
                            target_item = item
                            logger.info(f"✅ 対象アイテム発見: {item.get('name')} (ID: {item.get('id')}) - キーワード: {keyword}")
                            break
                    
                    if target_item:
                        break
                
                # 指定アイテムが見つからない場合はドライTシャツにフォールバック
                if not target_item:
                    logger.warning(f"指定アイテム '{item_type}' が見つかりません。ドライTシャツを検索します。")
                    dry_tshirt_keywords = item_type_mapping.get('dry-t-shirt', ['dry-t-shirt'])
                    for item in items:
                        item_name = item.get('name', '').lower()
                        for keyword in dry_tshirt_keywords:
                            if keyword.lower() in item_name:
                                target_item = item
                                logger.info(f"✅ フォールバック: ドライTシャツアイテム発見: {item.get('name')} (ID: {item.get('id')})")
                                break
                        if target_item:
                            break
                
                # 最後の手段として最初のアイテムを使用
                if not target_item and items:
                    target_item = items[0]
                    logger.info(f"最後の手段として最初のアイテムを使用: {target_item.get('name')}")
            
            if not target_item:
                return {'success': False, 'error': '利用可能なアイテムが見つかりませんでした'}
            
            # 2. Zennのベストプラクティスに従って、画像アップロードと商品作成を同時実行
            try:
                # 画像をダウンロード
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                
                # ファイル形式を判定
                content_type = response.headers.get('content-type', 'image/png')
                if 'image/jpeg' in content_type or 'image/jpg' in content_type:
                    mime_type = 'image/jpeg'
                else:
                    mime_type = 'image/png'
                
                # Base64エンコード
                import base64
                image_base64 = base64.b64encode(response.content).decode('utf-8')
                
                # マテリアルタイトルと商品情報
                material_title = f"{car_name} - 生成画像"
                
                # アイテム種類に応じた商品名を生成
                item_display_name = self._get_item_display_name(target_item.get('name', ''), item_type)
                product_title = f"AISHA - {item_display_name}"
                product_description = description or f"AISHA で生成された {car_name} の画像を使用したオリジナル{item_display_name}です。"
                
                # 追加利益が指定されている場合はそれを使用、そうでなければデフォルト値
                if additional_profit > 0:
                    profit_amount = additional_profit
                else:
                    profit_amount = 500 if item_type == 'sticker' else 1000
                
                # Zennで推奨されているJSON形式でマテリアルと商品を同時作成
                # 商品タイプに応じたパラメータを設定
                product_config = {
                    'itemId': target_item['id'],
                    'published': True
                }
                
                # 管理画面のAPI設定を適用（新しいフォーマット対応）
                if api_config:
                    # 新しいapi_configフォーマットから必要なパラメーターを抽出
                    if 'itemId' in api_config:
                        product_config['itemId'] = api_config['itemId']
                    if 'exemplaryItemVariantId' in api_config:
                        product_config['exemplaryItemVariantId'] = api_config['exemplaryItemVariantId']
                    if 'resizeMode' in api_config:
                        product_config['resizeMode'] = api_config['resizeMode']
                    
                    # needs_sub_materialsフラグに基づいてsub_materialsを条件付きで追加
                    if goods_config and goods_config.needs_sub_materials:
                        # sub_materialsが必要な商品の場合、textureを含む形で追加
                        if 'sub_materials' in api_config and api_config['sub_materials']:
                            sub_materials = []
                            for sub_material in api_config['sub_materials']:
                                sub_materials.append({
                                    'texture': f'data:{mime_type};base64,{image_base64}',
                                    'printSide': sub_material.get('printSide', 'front'),
                                    'enabled': True
                                })
                            product_config['sub_materials'] = sub_materials
                            logger.info(f"🔧 sub_materialsを追加: {sub_materials}")
                        else:
                            # api_configにsub_materialsがない場合はデフォルトで追加
                            product_config['sub_materials'] = [{
                                'texture': f'data:{mime_type};base64,{image_base64}',
                                'printSide': 'front',
                                'enabled': True
                            }]
                            logger.info(f"🔧 デフォルトsub_materialsを追加")
                    else:
                        logger.info(f"🔧 sub_materialsは不要（needs_sub_materials=False）")
                    
                    logger.info(f"🔧 管理画面のAPI設定を適用: {api_config}")
                
                # 後方互換性のため、従来の条件分岐も残す
                if item_type == 'embroidered-fleece-jacket' and not api_config:
                    product_config.update({
                        'embroidery': True,
                        'maxColors': 8,
                        'maxSize': '10x10cm'
                    })
                    logger.info(f"🔧 従来の刺しゅう設定を適用")
                
                data = {
                    'texture': f'data:{mime_type};base64,{image_base64}',
                    'title': product_title,  # 商品タイトルとして使用
                    'price': profit_amount,  # 利益額（ステッカー: 500円、その他: 1000円）
                    'description': product_description,
                    'products': [product_config]
                }
                
                logger.info(f"🛠️ SUZURI マテリアル+商品同時作成開始:")
                logger.info(f"  📸 Image size: {len(response.content)} bytes")
                logger.info(f"  📸 Image MIME: {mime_type}")
                logger.info(f"  🚗 Product title: {product_title}")
                logger.info(f"  🎯 Item ID: {target_item['id']} ({target_item.get('name')})")
                logger.info(f"  🏷️ Item type: {item_type}")
                logger.info(f"  💰 Profit price: {profit_amount}円")
                logger.info(f"  📍 Print places: {print_places or 'デフォルト'}")
                logger.info(f"  🔄 Multi printable: {is_multi_printable}")
                
                # 管理画面のAPI設定をログ出力
                if api_config:
                    logger.info(f"  📋 管理画面API設定:")
                    for key, value in api_config.items():
                        logger.info(f"    - {key}: {value}")
                
                # 刺しゅう商品の場合は特別なログを追加
                if item_type == 'embroidered-fleece-jacket':
                    logger.info(f"  🧵 刺しゅう商品設定:")
                    logger.info(f"    - 刺しゅうフラグ: {product_config.get('embroidery', False)}")
                    logger.info(f"    - 最大色数: {product_config.get('maxColors', 'N/A')}")
                    logger.info(f"    - 最大サイズ: {product_config.get('maxSize', 'N/A')}")
                
                logger.info(f"  📋 送信データ構造: {list(data.keys())}")
                logger.info(f"  📦 商品設定: {product_config}")
                
                result = self._make_request('POST', '/materials', data=data)
                
                if result and not result.get('error'):
                    logger.info(f"✅ マテリアル+商品作成成功")
                    logger.info(f"📋 レスポンス構造: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                    
                    # レスポンス構造を解析
                    material_info = result.get('material', result)
                    products_info = result.get('products', [])
                    
                    # 最初の商品情報を取得
                    product_info = products_info[0] if products_info else None
                    
                    if product_info:
                        # sampleUrlを使って商品詳細ページのURLを取得
                        product_url = product_info.get('sampleUrl', f"https://suzuri.jp/")
                        
                        logger.info(f"🔗 商品URL: {product_url}")
                        logger.info(f"🖼️ サンプル画像URL: {product_info.get('sampleImageUrl', 'なし')}")
                        
                        return {
                            'success': True,
                            'product': product_info,
                            'material': material_info,
                            'item': target_item,
                            'product_url': product_url
                        }
                    else:
                        logger.warning("⚠️ マテリアル作成成功だが商品情報が取得できませんでした")
                        return {
                            'success': False,
                            'error': '商品の作成に失敗しました（レスポンスに商品情報が含まれていません）'
                        }
                else:
                    # エラーレスポンスの処理
                    error_message = result.get('message', '不明なエラー') if result else 'APIレスポンスがありません'
                    logger.error(f"❌ マテリアル+商品作成失敗: {error_message}")
                    return {
                        'success': False,
                        'error': f'SUZURI APIエラー: {error_message}'
                    }
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to download image from {image_url}: {str(e)}")
                return {'success': False, 'error': f'画像のダウンロードに失敗しました: {str(e)}'}
            except Exception as e:
                logger.error(f"Material+Product creation failed: {str(e)}")
                return {'success': False, 'error': f'画像処理中にエラーが発生しました: {str(e)}'}
            
        except Exception as e:
            logger.error(f"SUZURI merchandise creation failed: {str(e)}")
            
            # エラーメッセージを詳細に構築
            error_message = str(e)
            if 'requests.exceptions.ConnectionError' in str(type(e)):
                error_message = 'SUZURI APIに接続できませんでした。ネットワーク接続を確認してください。'
            elif 'Timeout' in str(type(e)):
                error_message = 'SUZURI APIのタイムアウトが発生しました。しばらく待ってから再試行してください。'
            elif '401' in str(e):
                error_message = 'SUZURI APIの認証に失敗しました。APIトークンを確認してください。'
            elif '400' in str(e):
                error_message = 'リクエストの形式が正しくありません。画像URLや車名を確認してください。'
            elif '403' in str(e):
                error_message = 'SUZURI APIへのアクセス権限がありません。'
            elif '404' in str(e):
                error_message = 'SUZURI APIのエンドポイントが見つかりません。'
            elif '500' in str(e):
                error_message = 'SUZURI APIサーバーでエラーが発生しました。'
            
            return {'success': False, 'error': error_message}
    
    def get_user_products(self, page: int = 1, per_page: int = 20) -> Optional[Dict]:
        """
        ユーザーの商品一覧を取得
        """
        params = f"?page={page}&per_page={per_page}"
        return self._make_request('GET', f'/products{params}')
    
    def get_product_detail(self, product_id: int) -> Optional[Dict]:
        """
        商品詳細を取得
        """
        return self._make_request('GET', f'/products/{product_id}')
