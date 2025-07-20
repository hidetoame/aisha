#!/usr/bin/env python
"""
api_configからsub_materialsを削除して問題を解決
"""
import os
import sys
import django

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.goods_management import GoodsManagement

def remove_sub_materials():
    """api_configからsub_materialsを削除"""
    
    print("=== sub_materials削除開始 ===")
    
    try:
        goods_list = GoodsManagement.objects.filter(is_public=True)
        updated_count = 0
        
        for goods in goods_list:
            if 'sub_materials' in goods.api_config:
                print(f"🔧 修正中: {goods.display_name}")
                print(f"   修正前: {goods.api_config}")
                
                # sub_materialsを削除
                new_config = goods.api_config.copy()
                del new_config['sub_materials']
                
                goods.api_config = new_config
                goods.save()
                
                print(f"   修正後: {goods.api_config}")
                print("")
                updated_count += 1
            else:
                print(f"✅ 問題なし: {goods.display_name}")
        
        print(f"=== 修正完了 ===")
        print(f"修正された商品: {updated_count}件")
        
        # 修正後の確認
        print(f"\n=== 修正後の全設定 ===")
        for goods in GoodsManagement.objects.filter(is_public=True).order_by('display_order'):
            print(f"{goods.display_name}: {goods.api_config}")
        
    except Exception as e:
        print(f"❌ エラー: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    remove_sub_materials()
