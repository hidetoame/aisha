#!/usr/bin/env python
"""
SUZURI アイテムのsub_materials対応リストをJSONで出力
"""
import os
import sys
import django
import json

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.services.suzuri_api_service import SuzuriAPIService

def create_sub_materials_reference():
    """sub_materials対応リファレンスをJSON形式で作成"""
    
    try:
        # SUZURI APIからアイテム取得
        suzuri_service = SuzuriAPIService()
        items = suzuri_service.get_items()
        
        if not items:
            print("❌ SUZURI APIからデータを取得できませんでした")
            return
        
        # 分析結果
        reference = {
            "generated_at": "2024-01-20",
            "total_items": len(items),
            "items": {},
            "categories": {
                "needs_sub_materials": [],
                "no_sub_materials_needed": [],
                "single_print_only": []
            }
        }
        
        for item in items:
            item_id = item.get('id')
            item_name = item.get('name', '')
            available_print_places = item.get('availablePrintPlaces', [])
            is_multi_printable = item.get('isMultiPrintable', False)
            
            # sub_materials必要判定
            needs_sub_materials = len(available_print_places) > 1 or is_multi_printable
            
            item_info = {
                "id": item_id,
                "name": item_name,
                "available_print_places": available_print_places,
                "is_multi_printable": is_multi_printable,
                "needs_sub_materials": needs_sub_materials,
                "recommended_config": {
                    "itemId": item_id,
                    "exemplaryItemVariantId": item.get('variants', [{}])[0].get('id') if item.get('variants') else None,
                    "published": True
                }
            }
            
            # resizeModeの推定
            if any(keyword in item_name.lower() for keyword in ['case', 'notebook', 'full-graphic']):
                item_info["recommended_config"]["resizeMode"] = "cover"
            else:
                item_info["recommended_config"]["resizeMode"] = "contain"
            
            reference["items"][str(item_id)] = item_info
            
            # カテゴリ分け
            if needs_sub_materials:
                reference["categories"]["needs_sub_materials"].append(item_id)
            elif len(available_print_places) == 1:
                reference["categories"]["single_print_only"].append(item_id)
            else:
                reference["categories"]["no_sub_materials_needed"].append(item_id)
        
        # JSONファイルに保存
        output_file = "/app/suzuri_sub_materials_reference.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(reference, f, ensure_ascii=False, indent=2)
        
        print(f"✅ リファレンスファイルを作成: {output_file}")
        print(f"📊 統計:")
        print(f"  全アイテム数: {reference['total_items']}")
        print(f"  sub_materials必要: {len(reference['categories']['needs_sub_materials'])}")
        print(f"  単一プリントのみ: {len(reference['categories']['single_print_only'])}")
        print(f"  その他: {len(reference['categories']['no_sub_materials_needed'])}")
        
        # 現在のDB設定の問題点を特定
        print(f"\n🔍 現在のDB設定の問題点:")
        try:
            from api.models.goods_management import GoodsManagement
            db_items = GoodsManagement.objects.filter(is_public=True)
            
            problems = []
            for goods in db_items:
                item_info = reference["items"].get(str(goods.suzuri_item_id))
                if item_info:
                    has_sub_materials = 'sub_materials' in goods.api_config
                    should_have = item_info["needs_sub_materials"]
                    
                    if has_sub_materials and not should_have:
                        problems.append({
                            "item": goods.display_name,
                            "id": goods.suzuri_item_id,
                            "issue": "不要なsub_materialsが設定されている",
                            "action": "sub_materials削除"
                        })
            
            if problems:
                print(f"  問題のある設定: {len(problems)}件")
                for problem in problems:
                    print(f"    ❌ {problem['item']} (ID:{problem['id']}) - {problem['action']}")
            else:
                print(f"  ✅ 問題なし")
                
        except Exception as e:
            print(f"❌ DB設定確認エラー: {str(e)}")
        
        return reference
        
    except Exception as e:
        print(f"❌ エラー: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_sub_materials_reference()
