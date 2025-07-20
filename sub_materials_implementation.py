# create_car_merchandiseメソッドの修正版（sub_materials対応）

def create_car_merchandise_with_sub_materials(self, image_url: str, car_name: str, description: str = "", item_type: str = "heavyweight-t-shirt", item_id: int = None, additional_profit: int = 0, print_places: List[str] = None, is_multi_printable: bool = False) -> Dict[str, Any]:
    """
    sub_materialsを正しく処理してグッズを作成する
    """
    
    # 管理画面からAPI設定を取得
    try:
        from api.models.goods_management import GoodsManagement
        goods_config = GoodsManagement.objects.filter(
            suzuri_item_id=item_id,
            is_public=True
        ).first()
        
        if goods_config:
            api_config = goods_config.api_config or {}
            logger.info(f"📋 管理画面から取得した設定: {api_config}")
        else:
            api_config = {}
    except Exception as e:
        logger.warning(f"管理画面からの設定取得に失敗: {str(e)}")
        api_config = {}
    
    try:
        # 画像をダウンロード
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # ファイル形式を判定
        content_type = response.headers.get('content-type', 'image/png')
        mime_type = 'image/jpeg' if 'jpeg' in content_type else 'image/png'
        
        # Base64エンコード
        import base64
        image_base64 = base64.b64encode(response.content).decode('utf-8')
        texture_data = f'data:{mime_type};base64,{image_base64}'
        
        # 基本的な商品設定
        product_config = {
            'itemId': api_config.get('itemId', item_id),
            'exemplaryItemVariantId': api_config.get('exemplaryItemVariantId'),
            'published': True
        }
        
        # resizeModeの設定
        if 'resizeMode' in api_config:
            product_config['resizeMode'] = api_config['resizeMode']
        
        # sub_materialsの正しい処理
        if 'sub_materials' in api_config and api_config['sub_materials']:
            # sub_materialsが設定されている場合は正しい形式で追加
            sub_materials = []
            for sub_mat in api_config['sub_materials']:
                if 'printSide' in sub_mat:
                    sub_materials.append({
                        'texture': texture_data,  # ←ここが重要！画像データを追加
                        'printSide': sub_mat['printSide'],
                        'enabled': sub_mat.get('enabled', True)
                    })
            
            if sub_materials:
                product_config['sub_materials'] = sub_materials
                logger.info(f"🖨️ sub_materials設定: {len(sub_materials)}箇所")
        
        # メインデータ
        data = {
            'texture': texture_data,
            'title': f"{car_name} {self._get_item_display_name('', item_type)}",
            'price': additional_profit if additional_profit > 0 else 1000,
            'description': description,
            'products': [product_config]
        }
        
        logger.info(f"🛠️ SUZURI API送信データ:")
        logger.info(f"  商品設定: {product_config}")
        
        result = self._make_request('POST', '/materials', data=data)
        
        # 結果の処理...
        if result and not result.get('error'):
            return {
                'success': True,
                'product': result.get('products', [{}])[0],
                'material': result.get('material', {}),
                'product_url': result.get('products', [{}])[0].get('sampleUrl', '')
            }
        else:
            return {
                'success': False,
                'error': result.get('message', 'SUZURI API エラー')
            }
            
    except Exception as e:
        logger.error(f"❌ グッズ作成エラー: {str(e)}")
        return {'success': False, 'error': str(e)}
