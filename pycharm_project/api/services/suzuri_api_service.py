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

    def upload_material_and_create_product(self, image_url: str, title: str, item_id: int, description: str = "", price: int = 0) -> Optional[Dict]:
        """
        URL から画像をダウンロードして、マテリアルと商品を同時に作成
        
        Args:
            image_url: ダウンロードする画像のURL
            title: マテリアル・商品のタイトル
            item_id: アイテムID（148: Tシャツなど）
            description: 商品説明
            price: 商品価格（デフォルト0）
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
    
    def create_car_merchandise(self, image_url: str, car_name: str, description: str = "") -> Dict[str, Any]:
        """
        車の画像からグッズを作成する統合メソッド
        
        Args:
            image_url: 車の画像URL
            car_name: 車の名前
            description: 商品説明
            
        Returns:
            作成結果の辞書（成功/失敗、作成された商品情報など）
        """
        try:
            # デモモードの場合は、デモレスポンスを返す
            if self.demo_mode:
                logger.info("デモモードでSUZURIグッズ作成をシミュレート")
                return {
                    'success': True,
                    'product': {
                        'id': 12345,
                        'title': f"{car_name} Tシャツ",
                        'description': description or f"AISHA で生成された {car_name} の画像を使用したオリジナルTシャツです。",
                        'price': 2500,
                        'created_at': '2024-01-01T12:00:00Z'
                    },
                    'material': {
                        'id': 67890,
                        'title': f"{car_name} - 生成画像",
                        'url': image_url
                    },
                    'item': {
                        'id': 1,
                        'name': 'T-Shirt',
                        'base_price': 2500
                    },
                    'product_url': f"https://suzuri.jp/products/demo-{car_name.lower().replace(' ', '-')}"
                }
            
            # 1. アイテム一覧を取得
            items = self.get_items()
            if not items:
                return {'success': False, 'error': 'アイテム一覧の取得に失敗しました'}
            
            # エラーレスポンスかどうかを確認
            if isinstance(items, dict) and items.get('error'):
                return {
                    'success': False, 
                    'error': f'SUZURI API エラー: {items.get("message", "不明なエラー")}'
                }
            
            # Tシャツのアイテムを探す (デバッグログ追加)
            tshirt_item = None
            logger.info(f"取得したアイテム数: {len(items)}")
            
            for item in items:
                item_name = item.get('name', '').lower()
                logger.info(f"アイテム検索中: ID={item.get('id')}, Name='{item.get('name')}', Lower='{item_name}'")
                
                # より幅広い検索条件でTシャツを探す
                if any(keyword in item_name for keyword in ['t-shirt', 'tshirt', 't_shirt', 'shirt', 'シャツ']):
                    tshirt_item = item
                    logger.info(f"✅ Tシャツアイテム発見: {item.get('name')} (ID: {item.get('id')})")
                    break
            
            # 見つからない場合は最初のアイテムを使用
            if not tshirt_item and items:
                tshirt_item = items[0]
                logger.info(f"Tシャツが見つからないため、最初のアイテムを使用: {tshirt_item.get('name')}")
            
            if not tshirt_item:
                return {'success': False, 'error': '利用可能なアイテムが見つかりませんでした'}
            
            # 2. マテリアル（画像）をアップロード
            material_title = f"{car_name} - 生成画像"
            material = self.upload_material_from_url(image_url, material_title)
            
            if not material:
                return {'success': False, 'error': 'マテリアルのアップロードに失敗しました'}
            
            # エラーレスポンスかどうかを確認
            if isinstance(material, dict) and material.get('error'):
                return {
                    'success': False, 
                    'error': f'マテリアルアップロード エラー: {material.get("message", "不明なエラー")}'
                }
            
            # デバッグ: マテリアルレスポンスの構造確認
            logger.info(f"マテリアルレスポンス構造: {material}")
            logger.info(f"マテリアル利用可能キー: {list(material.keys()) if isinstance(material, dict) else 'レスポンスが辞書ではありません'}")
            
            # マテリアルIDの取得（複数の可能性を試す）
            material_id = None
            if isinstance(material, dict):
                # 一般的なキー名を試す
                for key in ['id', 'material_id', 'materialId', 'material', 'data']:
                    if key in material:
                        if isinstance(material[key], dict) and 'id' in material[key]:
                            material_id = material[key]['id']
                            logger.info(f"マテリアルID発見（ネスト）: {key}.id = {material_id}")
                            break
                        elif isinstance(material[key], (int, str)):
                            material_id = material[key]
                            logger.info(f"マテリアルID発見: {key} = {material_id}")
                            break
            
            if not material_id:
                logger.error(f"マテリアルIDが見つかりません。レスポンス: {material}")
                return {'success': False, 'error': 'マテリアルIDの取得に失敗しました'}
            
            # 3. 商品を作成
            product_title = f"{car_name} Tシャツ"
            product_description = description or f"AISHA で生成された {car_name} の画像を使用したオリジナルTシャツです。"
            
            product = self.create_product(
                material_id=material_id,
                item_id=tshirt_item['id'],
                title=product_title,
                description=product_description
            )
            
            if not product:
                return {'success': False, 'error': '商品の作成に失敗しました'}
            
            # エラーレスポンスかどうかを確認
            if isinstance(product, dict) and product.get('error'):
                return {
                    'success': False, 
                    'error': f'商品作成 エラー: {product.get("message", "不明なエラー")}'
                }
            
            # デバッグ: 商品レスポンスの構造確認
            logger.info(f"商品レスポンス構造: {product}")
            logger.info(f"商品利用可能キー: {list(product.keys()) if isinstance(product, dict) else 'レスポンスが辞書ではありません'}")
            
            # 商品IDの取得
            product_id = None
            if isinstance(product, dict):
                for key in ['id', 'product_id', 'productId']:
                    if key in product:
                        if isinstance(product[key], dict) and 'id' in product[key]:
                            product_id = product[key]['id']
                            break
                        elif isinstance(product[key], (int, str)):
                            product_id = product[key]
                            break
            
            # 商品URLの構築
            product_url = f"https://suzuri.jp/products/{product_id}" if product_id else "https://suzuri.jp/"
            
            return {
                'success': True,
                'product': product,
                'material': material,
                'item': tshirt_item,
                'product_url': product_url
            }
            
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
