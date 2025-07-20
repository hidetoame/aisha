#!/usr/bin/env python
"""
sub_materialsを正しく処理するための修正版
"""
import os
import sys
import django

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.goods_management import GoodsManagement

def fix_sub_materials_properly():
    """sub_materialsを正しい形式に修正、または削除"""
    
    print("=== sub_materials正しい修正開始 ===")
    
    # 選択肢を提示
    print("修正方法を選択してください:")
    print("1. sub_materialsを完全削除（推奨・簡単）")
    print("2. sub_materialsを正しい形式に修正（複数面プリント用）")
    
    choice = input("選択 (1 or 2): ").strip()
    
    try:
        goods_list = GoodsManagement.objects.filter(is_public=True)
        updated_count = 0
        
        for goods in goods_list:
            if 'sub_materials' in goods.api_config:
                print(f"\n🔧 修正中: {goods.display_name}")
                print(f"   修正前: {goods.api_config}")
                
                new_config = goods.api_config.copy()
                
                if choice == "1":
                    # 方法1: sub_materialsを削除
                    del new_config['sub_materials']
                    print("   ✅ sub_materialsを削除")
                
                elif choice == "2":
                    # 方法2: 正しい形式に修正
                    # この場合、実際の画像データが必要になるため、
                    # 動的に生成する仕組みが必要
                    print("   ⚠️ この方法は実装が複雑なため、方法1を推奨します")
                    continue
                
                goods.api_config = new_config
                goods.save()
                
                print(f"   修正後: {goods.api_config}")
                updated_count += 1
        
        print(f"\n=== 修正完了 ===")
        print(f"修正された商品: {updated_count}件")
        
    except Exception as e:
        print(f"❌ エラー: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_sub_materials_properly()
