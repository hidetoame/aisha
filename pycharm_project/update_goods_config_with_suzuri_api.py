#!/usr/bin/env python
"""
SUZURI APIから正しいアイテム情報を取得して、商品データベースのAPI設定を更新するスクリプト
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

def determine_resize_mode(item_name: str) -> str:
    """商品タイプに応じてresizeModeを決定"""
    # 刺しゅう商品はcontain、その他はcover
    if 'embroidered' in item_name:
        return 'contain'
    else:
        return 'cover'

def update_goods_config_with_suzuri_api():
    """SUZURI APIから正しいアイテム情報を取得して、データベースのapi_configを更新"""
    
    print("=== SUZURI APIから正しいアイテム情報を取得して更新開始 ===")
    
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
        
        updated_count = 0
        skipped_count = 0
        
        # 各アイテムの情報を処理
        for item in items:
            item_id = item.get('id')
            item_name = item.get('name')
            
            if not item_id or not item_name:
                print(f"⚠️ アイテム情報が不完全: {item}")
                continue
            
            # データベースから対応する商品を検索
            try:
                goods = GoodsManagement.objects.get(suzuri_item_id=item_id)
            except GoodsManagement.DoesNotExist:
                print(f"⚠️ データベースに商品が見つかりません: item_id={item_id}, name={item_name}")
                skipped_count += 1
                continue
            
            # exemplaryItemVariantIdを取得（最初の有効なvariant）
            exemplary_variant_id = None
            variants = item.get('variants', [])
            for variant in variants:
                if variant.get('enabled', False):
                    exemplary_variant_id = variant.get('id')
                    break
            
            if not exemplary_variant_id:
                print(f"⚠️ 有効なvariantが見つかりません: item_id={item_id}, name={item_name}")
                skipped_count += 1
                continue
            
            # availablePrintPlacesを取得
            available_print_places = item.get('availablePrintPlaces', [])
            if not available_print_places:
                print(f"⚠️ プリント位置が設定されていません: item_id={item_id}, name={item_name}")
                skipped_count += 1
                continue
            
            # resizeModeを決定
            resize_mode = determine_resize_mode(item_name)
            
            # 正しいapi_configを作成
            api_config = {
                'itemId': item_id,
                'exemplaryItemVariantId': exemplary_variant_id,
                'sub_materials': [{
                    'printSide': available_print_places[0]  # 最初のプリント位置を使用
                }],
                'resizeMode': resize_mode
            }
            
            # データベースを更新
            goods.api_config = api_config
            goods.save()
            
            print(f"✅ {goods.display_name} ({item_name}):")
            print(f"   - itemId: {item_id}")
            print(f"   - exemplaryItemVariantId: {exemplary_variant_id}")
            print(f"   - printSide: {available_print_places[0]}")
            print(f"   - resizeMode: {resize_mode}")
            print(f"   - availablePrintPlaces: {available_print_places}")
            
            updated_count += 1
        
        print(f"\n=== 更新完了 ===")
        print(f"更新された商品: {updated_count}件")
        print(f"スキップされた商品: {skipped_count}件")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    update_goods_config_with_suzuri_api() 