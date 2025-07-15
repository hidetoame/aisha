import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models.phone_user import PhoneUser
from api.models.credit_charge import UserCredit, CreditTransaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'PhoneUserのクレジットを統一クレジットシステムに移行'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='実際の移行を行わず、結果のみを表示'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='既存のUserCreditが存在する場合も上書き'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('=== PhoneUserクレジット移行開始 ==='))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN モード - 実際の変更は行われません'))
        
        # 移行対象のPhoneUserを取得
        phone_users = PhoneUser.objects.all()
        total_users = phone_users.count()
        
        if total_users == 0:
            self.stdout.write(self.style.WARNING('移行対象のPhoneUserが見つかりません'))
            return
        
        self.stdout.write(f'移行対象ユーザー数: {total_users}')
        
        migrated_count = 0
        skipped_count = 0
        error_count = 0
        
        for phone_user in phone_users:
            try:
                # Firebase UIDをuser_idとして使用
                user_id = phone_user.firebase_uid
                current_credits = phone_user.credits
                
                self.stdout.write(f'\n処理中: {phone_user.nickname} (UID: {user_id})')
                self.stdout.write(f'  現在のクレジット: {current_credits}')
                
                # 既存のUserCreditをチェック
                existing_credit, created = UserCredit.objects.get_or_create(
                    user_id=user_id,
                    defaults={'credit_balance': 0}
                )
                
                if not created and not force:
                    self.stdout.write(
                        self.style.WARNING(f'  スキップ: 既存のUserCredit({existing_credit.credit_balance})が存在')
                    )
                    skipped_count += 1
                    continue
                
                if not dry_run:
                    with transaction.atomic():
                        # UserCreditを更新
                        old_balance = existing_credit.credit_balance
                        existing_credit.credit_balance = current_credits
                        existing_credit.save()
                        
                        # 初期クレジットの取引履歴を作成
                        if current_credits > 0:
                            CreditTransaction.objects.create(
                                user_id=user_id,
                                transaction_type='bonus',
                                amount=current_credits,
                                balance_after=current_credits,
                                description=f'PhoneUserから移行: {phone_user.nickname}'
                            )
                        
                        self.stdout.write(
                            self.style.SUCCESS(f'  完了: {old_balance} → {current_credits} クレジット')
                        )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'  [DRY RUN] 移行予定: {current_credits} クレジット')
                    )
                
                migrated_count += 1
                
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  エラー: {str(e)}')
                )
                logger.error(f'PhoneUser {phone_user.id} migration failed: {str(e)}')
        
        # 結果サマリー
        self.stdout.write(f'\n=== 移行結果 ===')
        self.stdout.write(f'総ユーザー数: {total_users}')
        self.stdout.write(f'移行成功: {migrated_count}')
        self.stdout.write(f'スキップ: {skipped_count}')
        self.stdout.write(f'エラー: {error_count}')
        
        if not dry_run and migrated_count > 0:
            self.stdout.write(self.style.SUCCESS('移行が完了しました！'))
            self.stdout.write(self.style.WARNING('注意: PhoneUserモデルのcreditsフィールドは今後非推奨となります'))
        elif dry_run:
            self.stdout.write(self.style.SUCCESS('DRY RUN完了。実際の移行を行う場合は --dry-run を外してください'))