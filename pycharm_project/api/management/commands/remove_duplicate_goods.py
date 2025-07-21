from django.core.management.base import BaseCommand
from django.db import transaction
from api.models.suzuri_merchandise import SuzuriMerchandise
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'グッズ履歴の重複データを削除します'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='実際の削除を行わず、削除対象を表示するだけ',
        )
        parser.add_argument(
            '--user-id',
            type=str,
            help='特定のユーザーの重複データのみを削除',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        user_id = options['user_id']
        
        self.stdout.write(self.style.SUCCESS('🔍 グッズ履歴の重複データを検索中...'))
        
        # 削除対象を特定
        duplicates = self.find_duplicates(user_id)
        
        if not duplicates:
            self.stdout.write(self.style.SUCCESS('✅ 重複データは見つかりませんでした'))
            return
        
        # 削除対象を表示
        self.display_duplicates(duplicates)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 ドライラン: 実際の削除は行われません'))
            return
        
        # 削除の確認
        if not self.confirm_deletion(len(duplicates)):
            self.stdout.write(self.style.WARNING('❌ 削除をキャンセルしました'))
            return
        
        # 重複データを削除
        deleted_count = self.delete_duplicates(duplicates)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ 重複データの削除が完了しました: {deleted_count}件')
        )

    def find_duplicates(self, user_id=None):
        """重複データを検索"""
        # 基本クエリ
        queryset = SuzuriMerchandise.objects.all()
        
        if user_id:
            queryset = queryset.filter(goods_creator_user_id=user_id)
            self.stdout.write(f'👤 ユーザーID: {user_id} のデータを対象とします')
        
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

    def display_duplicates(self, duplicates):
        """重複データを表示"""
        self.stdout.write(self.style.WARNING(f'\n📋 重複データが見つかりました: {len(duplicates)}グループ'))
        
        total_duplicates = sum(len(items) - 1 for items in duplicates.values())
        self.stdout.write(f'🗑️  削除対象: {total_duplicates}件')
        
        for i, (key, items) in enumerate(duplicates.items(), 1):
            user_id, library_id, product_id = key
            self.stdout.write(f'\n📦 グループ {i}:')
            self.stdout.write(f'   ユーザーID: {user_id}')
            self.stdout.write(f'   ライブラリ画像ID: {library_id}')
            self.stdout.write(f'   商品ID: {product_id}')
            self.stdout.write(f'   重複件数: {len(items)}件')
            
            # 各アイテムの詳細を表示
            for j, item in enumerate(items):
                status = "削除対象" if j > 0 else "保持"
                self.stdout.write(f'   {j+1}. {item.product_title} ({item.created_at}) - {status}')

    def confirm_deletion(self, group_count):
        """削除の確認"""
        self.stdout.write(f'\n⚠️  重複データ {group_count}グループ を削除しますか？')
        self.stdout.write('各グループの最新のデータ以外を削除します。')
        
        while True:
            response = input('削除を実行しますか？ (y/N): ').strip().lower()
            if response in ['y', 'yes']:
                return True
            elif response in ['n', 'no', '']:
                return False
            else:
                self.stdout.write('y または n を入力してください')

    @transaction.atomic
    def delete_duplicates(self, duplicates):
        """重複データを削除"""
        deleted_count = 0
        
        for key, items in duplicates.items():
            # 最新のデータ（作成日時が新しいもの）を保持し、他を削除
            sorted_items = sorted(items, key=lambda x: x.created_at, reverse=True)
            items_to_delete = sorted_items[1:]  # 最新以外を削除対象
            
            for item in items_to_delete:
                self.stdout.write(f'🗑️  削除: {item.product_title} (ID: {item.id})')
                item.delete()
                deleted_count += 1
        
        return deleted_count 