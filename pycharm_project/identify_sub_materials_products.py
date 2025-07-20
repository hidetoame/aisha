#!/usr/bin/env python
"""
sub_materialsが必要な商品を特定してフラグを設定するスクリプト
"""
import os
import sys
import django

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.goods_management import GoodsManagement

def identify_sub_materials_products():
    """sub_materialsが必要な商品を特定"""
    
    print("=== sub_materialsが必要な商品の特定開始 ===")
    
    # sub_materialsが必要な商品のリスト
    # SUZURI APIの仕様に基づいて設定
    sub_materials_required_items = [
        # 刺しゅう商品（複数面プリントが必要）
        'embroidered-fleece-jacket',  # 刺しゅうフリースジャケット
        'embroidered-t-shirt',        # 刺しゅうTシャツ
        'embroidered-hoodie',         # 刺しゅうフーディー
        
        # 複数面プリントが必要な商品
        'clear-multi-case',           # クリアマルチケース
        'mini-clear-multi-case',      # ミニクリアマルチケース
        'clear-file-folder',          # クリアファイルフォルダ
        
        # その他、複数面にプリント可能な商品
        'flat-can-case',              # フラット缶ケース
        'tarpaulin',                  # ターポリン
    ]
    
    print("sub_materialsが必要な商品タイプ:")
    for item in sub_materials_required_items:
        print(f"  - {item}")
    
    print("\n=== データベース更新開始 ===")
    
    updated_count = 0
    total_count = 0
    
    for goods in GoodsManagement.objects.all():
        total_count += 1
        item_name = goods.item_name
        
        # sub_materialsが必要かどうかを判定
        needs_sub_materials = item_name in sub_materials_required_items
        
        # フラグを更新
        if goods.needs_sub_materials != needs_sub_materials:
            goods.needs_sub_materials = needs_sub_materials
            goods.save()
            updated_count += 1
            
            status = "✅ 必要" if needs_sub_materials else "❌ 不要"
            print(f"{status} {goods.display_name} ({item_name})")
        else:
            status = "✅ 必要" if needs_sub_materials else "❌ 不要"
            print(f"{status} {goods.display_name} ({item_name}) - 変更なし")
    
    print(f"\n=== 更新完了 ===")
    print(f"総商品数: {total_count}件")
    print(f"更新された商品: {updated_count}件")
    
    # 結果の確認
    print(f"\n=== sub_materialsが必要な商品一覧 ===")
    sub_materials_goods = GoodsManagement.objects.filter(needs_sub_materials=True).order_by('display_order')
    for goods in sub_materials_goods:
        print(f"  - {goods.display_name} ({goods.item_name})")
    
    print(f"\n=== sub_materialsが不要な商品一覧 ===")
    normal_goods = GoodsManagement.objects.filter(needs_sub_materials=False).order_by('display_order')
    for goods in normal_goods:
        print(f"  - {goods.display_name} ({goods.item_name})")

if __name__ == '__main__':
    identify_sub_materials_products() 