#!/usr/bin/env python
"""
SUZURI APIの正しいフォーマットでapi_configを修正するスクリプト
"""
import os
import sys
import django

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.goods_management import GoodsManagement
from api.services.suzuri_api_service import SuzuriAPIService

def fix_api_config():
    """SUZURI APIの正しいフォーマットでapi_configを修正"""
    
    print("=== SUZURI API設定修正開始 ===")
    
    try:
        # SUZURI APIサービスを初期化
        suzuri_service = SuzuriAPIService()
        print("✅ SuzuriAPIService 初期化成功")
        
        # SUZURI APIから全アイテム情報を取得
        print("🔄 SUZURI APIからアイテム一覧を取得中...")
        items = suzuri_service.get_items()
        
        if not items:
            print("❌ SUZURI APIからアイテム一覧を取得できませんでした")
            return
        
        print(f"✅ {len(items)}個のアイテムを取得しました")
        
        # アイテムID -> アイテム情報のマップを作成
        items_map = {item.get('id'): item for item in items}
        
        # データベースの全商品を取得
        goods_list = GoodsManagement.objects.filter(is_public=True)
        
        updated_count = 0
        error_count = 0
        
        for goods in goods_list:
            try:
                item_id = goods.suzuri_item_id
                
                # SUZURI APIからのアイテム情報を取得
                suzuri_item = items_map.get(item_id)
                if not suzuri_item:
                    print(f"❌ SUZURI APIにアイテムが見つかりません: {goods.display_name} (ID: {item_id})")
                    error_count += 1
                    continue
                
                # 最初の有効なvariantを取得
                exemplary_variant_id = None
                variants = suzuri_item.get('variants', [])
                for variant in variants:
                    if variant.get('enabled', False):
                        exemplary_variant_id = variant.get('id')
                        break
                
                if not exemplary_variant_id:
                    print(f"❌ 有効なvariantが見つかりません: {goods.display_name}")
                    error_count += 1
                    continue
                
                # 正しいapi_configフォーマットを作成
                # SUZURIドキュメントに従った正確な形式
                api_config = {
                    'itemId': item_id,
                    'exemplaryItemVariantId': exemplary_variant_id,
                    'published': True
                }
                
                # 特殊なアイテムタイプの場合の追加設定
                item_name = suzuri_item.get('name', '')
                
                # resizeModeが利用可能な商品の場合
                if any(keyword in item_name for keyword in ['smartphone-case', 'notebook', 'full-graphic']):
                    api_config['resizeMode'] = 'cover'
                else:
                    api_config['resizeMode'] = 'contain'
                
                # 複数プリント可能な商品の場合
                available_print_places = suzuri_item.get('availablePrintPlaces', [])
                if len(available_print_places) > 1:
                    # sub_materialsは複数面プリント時のみ必要
                    # 通常の商品では不要
                    pass
                
                # データベースを更新
                goods.api_config = api_config
                goods.save()
                
                print(f"✅ 修正完了: {goods.display_name}")
                print(f"   itemId: {item_id}")
                print(f"   exemplaryItemVariantId: {exemplary_variant_id}")
                print(f"   resizeMode: {api_config.get('resizeMode')}")
                print(f"   availablePrintPlaces: {available_print_places}")
                print(f"   新しいapi_config: {api_config}")
                print("")
                
                updated_count += 1
                
            except Exception as e:
                print(f"❌ {goods.display_name}の更新でエラー: {str(e)}")
                error_count += 1
        
        print(f"=== 修正完了 ===")
        print(f"修正された商品: {updated_count}件")
        print(f"エラーが発生した商品: {error_count}件")
        
        # 修正後の確認
        print(f"\n=== 修正後の設定確認 ===")
        for goods in GoodsManagement.objects.filter(is_public=True).order_by('display_order'):
            print(f"{goods.display_name}: {goods.api_config}")
        
    except Exception as e:
        print(f"❌ スクリプト実行エラー: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_api_config()
