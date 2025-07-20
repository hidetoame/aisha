#!/usr/bin/env python
"""
商品データベースのAPI設定を一括更新するスクリプト
"""
import os
import sys
import django

# Django設定を読み込み
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.goods_management import GoodsManagement

def update_goods_config():
    """すべての商品に適切なAPI設定を追加"""
    
    # 商品タイプ別のAPI設定マッピング
    goods_config_mapping = {
        # Tシャツ系
        't-shirt': {
            'item_type': 't-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'heavyweight-t-shirt': {
            'item_type': 'heavyweight-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'lightweight-t-shirt': {
            'item_type': 'lightweight-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'embroidered-t-shirt': {
            'item_type': 'embroidered-t-shirt',
            'api_config': {'embroidery': True, 'maxColors': 8, 'maxSize': '10x10cm'}
        },
        'one-point-t-shirt': {
            'item_type': 'one-point-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'oversized-t-shirt': {
            'item_type': 'oversized-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'full-graphic-t-shirt': {
            'item_type': 'full-graphic-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'organic-cotton-t-shirt': {
            'item_type': 'organic-cotton-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'dry-t-shirt': {
            'item_type': 'dry-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'long-sleeve-t-shirt': {
            'item_type': 'long-sleeve-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'big-long-sleeve-t-shirt': {
            'item_type': 'big-long-sleeve-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'big-t-shirt': {
            'item_type': 'big-t-shirt',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        
        # フーディー・スウェット系
        'sweat': {
            'item_type': 'sweat',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'big-sweat': {
            'item_type': 'big-sweat',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'heavyweight-sweat': {
            'item_type': 'heavyweight-sweat',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'hoodie': {
            'item_type': 'hoodie',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'big-hoodie': {
            'item_type': 'big-hoodie',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'heavyweight-hoodie': {
            'item_type': 'heavyweight-hoodie',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'heavyweight-zip-hoodie': {
            'item_type': 'heavyweight-zip-hoodie',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'zip-hoodie': {
            'item_type': 'zip-hoodie',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        
        # 刺しゅう商品
        'embroidered-fleece-jacket': {
            'item_type': 'embroidered-fleece-jacket',
            'api_config': {'embroidery': True, 'maxColors': 8, 'maxSize': '10x10cm'}
        },
        
        # スマホケース系
        'smartphone-case': {
            'item_type': 'smartphone-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'android-smartphone-case': {
            'item_type': 'android-smartphone-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'clear-smartphone-case': {
            'item_type': 'clear-smartphone-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'soft-clear-smartphone-case': {
            'item_type': 'soft-clear-smartphone-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'book-style-smartphone-case': {
            'item_type': 'book-style-smartphone-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'smartphone-strap': {
            'item_type': 'smartphone-strap',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        
        # バッグ系
        'big-shoulder-bag': {
            'item_type': 'big-shoulder-bag',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'tote-bag': {
            'item_type': 'tote-bag',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'lunch-tote-bag': {
            'item_type': 'lunch-tote-bag',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'reusable-bag': {
            'item_type': 'reusable-bag',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'sacoche': {
            'item_type': 'sacoche',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'kinchaku': {
            'item_type': 'kinchaku',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        
        # 小物系
        'acrylic-keychain': {
            'item_type': 'acrylic-keychain',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'acrylic-stand': {
            'item_type': 'acrylic-stand',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'acrylic-block': {
            'item_type': 'acrylic-block',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'sticker': {
            'item_type': 'sticker',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'can-badge': {
            'item_type': 'can-badge',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'bandana': {
            'item_type': 'bandana',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'face-towel': {
            'item_type': 'face-towel',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'towel-handkerchief': {
            'item_type': 'towel-handkerchief',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'socks': {
            'item_type': 'socks',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'ankle-socks': {
            'item_type': 'ankle-socks',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'masking-tape': {
            'item_type': 'masking-tape',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'note': {
            'item_type': 'note',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        
        # 飲み物系
        'mug': {
            'item_type': 'mug',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'water-glass': {
            'item_type': 'water-glass',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'long-sized-water-glass': {
            'item_type': 'long-sized-water-glass',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'thermo-tumbler': {
            'item_type': 'thermo-tumbler',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        
        # その他
        'five-panel-cap': {
            'item_type': 'five-panel-cap',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'bucket-hat': {
            'item_type': 'bucket-hat',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'sandal': {
            'item_type': 'sandal',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'blanket': {
            'item_type': 'blanket',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'cushion': {
            'item_type': 'cushion',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'clear-multi-case': {
            'item_type': 'clear-multi-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'mini-clear-multi-case': {
            'item_type': 'mini-clear-multi-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'clear-file-folder': {
            'item_type': 'clear-file-folder',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'flat-can-case': {
            'item_type': 'flat-can-case',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
        'tarpaulin': {
            'item_type': 'tarpaulin',
            'api_config': {'embroidery': False, 'maxColors': None, 'maxSize': None}
        },
    }
    
    print("=== 商品API設定の一括更新開始 ===")
    
    updated_count = 0
    skipped_count = 0
    
    for goods in GoodsManagement.objects.all():
        item_name = goods.item_name
        
        if item_name in goods_config_mapping:
            config = goods_config_mapping[item_name]
            
            # 設定を更新
            goods.item_type = config['item_type']
            goods.api_config = config['api_config']
            goods.save()
            
            print(f"✅ {goods.display_name}: {config['item_type']} - {config['api_config']}")
            updated_count += 1
        else:
            print(f"⚠️ {goods.display_name} ({item_name}): 設定マッピングが見つかりません")
            skipped_count += 1
    
    print(f"\n=== 更新完了 ===")
    print(f"更新された商品: {updated_count}件")
    print(f"スキップされた商品: {skipped_count}件")

if __name__ == '__main__':
    update_goods_config() 