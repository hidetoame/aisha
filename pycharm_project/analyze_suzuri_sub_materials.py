#!/usr/bin/env python
"""
SUZURI APIからアイテム一覧を取得して、sub_materials対応が必要かどうかを判定するスクリプト
"""
import os
import sys
import django

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.services.suzuri_api_service import SuzuriAPIService

def analyze_suzuri_items_for_sub_materials():
    """SUZURI APIアイテムのsub_materials対応要否を分析"""
    
    print("=== SUZURI アイテムのsub_materials対応分析 ===")
    
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
        
        print(f"✅ {len(items)}個のアイテムを取得しました\n")
        
        # sub_materials必要判定の基準
        multi_print_keywords = [
            'shirt', 't-shirt', 'hoodie', 'sweatshirt', 'jacket', 'vest',
            'tote', 'bag', 'pouch', 'backpack'
        ]
        
        single_print_keywords = [
            'sticker', 'case', 'mug', 'tumbler', 'notebook', 'card',
            'badge', 'pin', 'keychain', 'magnet', 'coaster'
        ]
        
        # 分析結果を格納
        needs_sub_materials = []      # sub_materials対応必要
        no_sub_materials = []         # sub_materials対応不要
        uncertain = []                # 判定困難
        
        print("📊 アイテム分析結果:")
        print("=" * 80)
        print(f"{'ID':<5} {'アイテム名':<30} {'プリント箇所':<20} {'sub_materials':<15} {'判定理由'}")
        print("=" * 80)
        
        for item in items:
            item_id = item.get('id')
            item_name = item.get('name', '')
            available_print_places = item.get('availablePrintPlaces', [])
            is_multi_printable = item.get('isMultiPrintable', False)
            
            # 判定ロジック
            needs_sub = False
            reason = ""
            
            # 1. 複数プリント箇所がある場合
            if len(available_print_places) > 1:
                needs_sub = True
                reason = f"複数プリント箇所: {available_print_places}"
            
            # 2. isMultiPrintableフラグがTrueの場合
            elif is_multi_printable:
                needs_sub = True
                reason = "isMultiPrintable=True"
            
            # 3. アイテム名から推定（衣類系）
            elif any(keyword in item_name.lower() for keyword in multi_print_keywords):
                if len(available_print_places) == 1:
                    needs_sub = False
                    reason = f"衣類系だが単一プリント: {available_print_places}"
                else:
                    needs_sub = True
                    reason = f"衣類系で複数プリント可能性: {item_name}"
            
            # 4. 明らかに単一プリントのアイテム
            elif any(keyword in item_name.lower() for keyword in single_print_keywords):
                needs_sub = False
                reason = f"単一プリントアイテム: {item_name}"
            
            # 5. その他は判定困難
            else:
                reason = f"判定困難: {item_name}"
            
            # 結果の分類
            sub_materials_status = ""
            if needs_sub and len(available_print_places) > 1:
                needs_sub_materials.append(item)
                sub_materials_status = "必要"
            elif not needs_sub or len(available_print_places) <= 1:
                no_sub_materials.append(item)
                sub_materials_status = "不要"
            else:
                uncertain.append(item)
                sub_materials_status = "要確認"
            
            # 表示
            print(f"{item_id:<5} {item_name:<30} {str(available_print_places):<20} {sub_materials_status:<15} {reason}")
        
        print("=" * 80)
        
        # サマリー
        print(f"\n📈 分析サマリー:")
        print(f"  🔴 sub_materials必要: {len(needs_sub_materials)}個")
        print(f"  🟢 sub_materials不要: {len(no_sub_materials)}個")
        print(f"  🟡 要確認: {len(uncertain)}個")
        
        # sub_materials必要なアイテムの詳細
        if needs_sub_materials:
            print(f"\n🔴 sub_materials対応が必要なアイテム:")
            for item in needs_sub_materials:
                print(f"  ID: {item['id']:<5} {item['name']:<30} プリント箇所: {item.get('availablePrintPlaces', [])}")
        
        # sub_materials不要なアイテムの詳細
        if no_sub_materials:
            print(f"\n🟢 sub_materials対応が不要なアイテム:")
            for item in no_sub_materials[:10]:  # 最初の10個のみ表示
                print(f"  ID: {item['id']:<5} {item['name']:<30} プリント箇所: {item.get('availablePrintPlaces', [])}")
            if len(no_sub_materials) > 10:
                print(f"  ... 他 {len(no_sub_materials) - 10}個")
        
        # 現在のデータベース設定との比較
        print(f"\n🔍 現在のデータベース設定との比較:")
        try:
            from api.models.goods_management import GoodsManagement
            db_items = GoodsManagement.objects.filter(is_public=True)
            
            for goods in db_items:
                suzuri_item = next((item for item in items if item['id'] == goods.suzuri_item_id), None)
                if suzuri_item:
                    has_sub_materials_in_db = 'sub_materials' in goods.api_config
                    available_places = suzuri_item.get('availablePrintPlaces', [])
                    should_have_sub_materials = len(available_places) > 1
                    
                    status = "✅" if has_sub_materials_in_db == should_have_sub_materials else "❌"
                    recommendation = "sub_materials削除推奨" if has_sub_materials_in_db and not should_have_sub_materials else "設定OK"
                    
                    print(f"  {status} {goods.display_name} (ID:{goods.suzuri_item_id})")
                    print(f"     DB設定: {'sub_materials有り' if has_sub_materials_in_db else 'sub_materials無し'}")
                    print(f"     SUZURI: {available_places} → {recommendation}")
        
        except Exception as e:
            print(f"❌ データベース比較エラー: {str(e)}")
        
        # 推奨アクション
        print(f"\n💡 推奨アクション:")
        print(f"  1. 現在のDBからsub_materialsを全削除（400エラー解決）")
        print(f"  2. 将来的に複数面プリントが必要な場合のみ、正しい形式で実装")
        print(f"  3. sub_materials必要なアイテム（{len(needs_sub_materials)}個）は別途検討")
        
    except Exception as e:
        print(f"❌ エラー: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    analyze_suzuri_items_for_sub_materials()
