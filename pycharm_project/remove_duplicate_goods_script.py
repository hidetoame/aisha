#!/usr/bin/env python
"""
グッズ履歴の重複データを削除するスクリプト
使用方法: python remove_duplicate_goods_script.py
"""

import os
import sys
import django
from collections import defaultdict

# Django設定を読み込み
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from django.db import transaction
from api.models.suzuri_merchandise import SuzuriMerchandise

def find_duplicates():
    """重複データを検索"""
    print('🔍 グッズ履歴の重複データを検索中...')
    
    # 全データを取得
    queryset = SuzuriMerchandise.objects.all()
    
    # 重複を特定するためのキー
    duplicates = defaultdict(list)
    
    for merchandise in queryset.order_by('created_at'):
        # 重複判定のキー（同じユーザー、同じライブラリ画像、同じ商品ID）
        duplicate_key = (
            merchandise.goods_creator_user_id,
            merchandise.library_image_id,
            merchandise.product_id
        )
        duplicates[duplicate_key].append(merchandise)
    
    # 重複があるもののみを返す
    return {k: v for k, v in duplicates.items() if len(v) > 1}

def display_duplicates(duplicates):
    """重複データを表示"""
    if not duplicates:
        print('✅ 重複データは見つかりませんでした')
        return False
    
    print(f'\n📋 重複データが見つかりました: {len(duplicates)}グループ')
    
    total_duplicates = sum(len(items) - 1 for items in duplicates.values())
    print(f'🗑️  削除対象: {total_duplicates}件')
    
    for i, (key, items) in enumerate(duplicates.items(), 1):
        user_id, library_id, product_id = key
        print(f'\n📦 グループ {i}:')
        print(f'   ユーザーID: {user_id}')
        print(f'   ライブラリ画像ID: {library_id}')
        print(f'   商品ID: {product_id}')
        print(f'   重複件数: {len(items)}件')
        
        # 各アイテムの詳細を表示
        for j, item in enumerate(items):
            status = "削除対象" if j > 0 else "保持"
            print(f'   {j+1}. {item.product_title} ({item.created_at}) - {status}')
    
    return True

def confirm_deletion(group_count):
    """削除の確認"""
    print(f'\n⚠️  重複データ {group_count}グループ を削除しますか？')
    print('各グループの最新のデータ以外を削除します。')
    
    while True:
        response = input('削除を実行しますか？ (y/N): ').strip().lower()
        if response in ['y', 'yes']:
            return True
        elif response in ['n', 'no', '']:
            return False
        else:
            print('y または n を入力してください')

@transaction.atomic
def delete_duplicates(duplicates):
    """重複データを削除"""
    deleted_count = 0
    
    for key, items in duplicates.items():
        # 最新のデータ（作成日時が新しいもの）を保持し、他を削除
        sorted_items = sorted(items, key=lambda x: x.created_at, reverse=True)
        items_to_delete = sorted_items[1:]  # 最新以外を削除対象
        
        for item in items_to_delete:
            print(f'🗑️  削除: {item.product_title} (ID: {item.id})')
            item.delete()
            deleted_count += 1
    
    return deleted_count

def main():
    """メイン処理"""
    print('🚀 グッズ履歴の重複データ削除スクリプトを開始します')
    
    # 重複データを検索
    duplicates = find_duplicates()
    
    # 重複データを表示
    if not display_duplicates(duplicates):
        return
    
    # 削除の確認
    if not confirm_deletion(len(duplicates)):
        print('❌ 削除をキャンセルしました')
        return
    
    # 重複データを削除
    deleted_count = delete_duplicates(duplicates)
    
    print(f'\n✅ 重複データの削除が完了しました: {deleted_count}件')

if __name__ == '__main__':
    main() 