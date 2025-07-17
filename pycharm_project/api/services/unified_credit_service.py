import logging
from typing import Optional, Tuple
from django.db import transaction
from ..models.credit_charge import UserCredit, CreditTransaction
from ..models.phone_user import PhoneUser

logger = logging.getLogger(__name__)


class UnifiedCreditService:
    """統一クレジットサービス - 電話番号ユーザーとマイガレージユーザー共通"""

    @staticmethod
    def get_user_credits(user_id: str) -> int:
        """
        ユーザーのクレジット残高を取得
        
        Args:
            user_id: ユーザーID（Firebase UIDまたはフロントエンドユーザーID）
            
        Returns:
            int: クレジット残高
        """
        try:
            # 統一クレジットシステムから取得
            user_credit = UserCredit.objects.get(user_id=user_id)
            return user_credit.credit_balance
        except UserCredit.DoesNotExist:
            # 統一システムにない場合、PhoneUserが存在するかチェック
            try:
                phone_user = PhoneUser.objects.get(firebase_uid=user_id)
                logger.warning(f"PhoneUser {user_id} not in unified system, returning 0 credits")
                return 0
            except PhoneUser.DoesNotExist:
                logger.warning(f"User {user_id} not found in any credit system")
                return 0

    @staticmethod
    def consume_credits(user_id: str, amount: int, description: str = "") -> Tuple[bool, str]:
        """
        クレジットを消費する
        
        Args:
            user_id: ユーザーID
            amount: 消費クレジット数
            description: 取引説明
            
        Returns:
            Tuple[bool, str]: (成功/失敗, メッセージ)
        """
        try:
            with transaction.atomic():
                # 統一クレジットシステムから取得
                try:
                    user_credit = UserCredit.objects.get(user_id=user_id)
                    
                    # クレジット残高チェック
                    if user_credit.credit_balance < amount:
                        return False, f"クレジット不足: 残高 {user_credit.credit_balance}, 必要 {amount}"
                    
                    # クレジット消費
                    old_balance = user_credit.credit_balance
                    user_credit.deduct_credits(amount)
                    
                    # 取引履歴を記録
                    CreditTransaction.objects.create(
                        user_id=user_id,
                        transaction_type='usage',
                        amount=-amount,  # 消費は負の値
                        balance_after=user_credit.credit_balance,
                        description=description or f"クレジット消費: {amount}"
                    )
                    
                    logger.info(f"Credits consumed: User {user_id}, Amount: {amount}, Balance: {old_balance} -> {user_credit.credit_balance}")
                    return True, f"クレジットを消費しました: -{amount} (残高: {user_credit.credit_balance})"
                    
                except UserCredit.DoesNotExist:
                    return False, f"ユーザー {user_id} が統一クレジットシステムに存在しません"
                        
        except Exception as e:
            logger.error(f"Credit consumption failed: User {user_id}, Error: {str(e)}")
            return False, f"クレジット消費エラー: {str(e)}"

    @staticmethod
    def add_credits(user_id: str, amount: int, description: str = "", transaction_type: str = 'bonus') -> Tuple[bool, str]:
        """
        クレジットを追加する
        
        Args:
            user_id: ユーザーID
            amount: 追加クレジット数
            description: 取引説明
            transaction_type: 取引種別（bonus, charge, refund等）
            
        Returns:
            Tuple[bool, str]: (成功/失敗, メッセージ)
        """
        try:
            with transaction.atomic():
                # UserCreditを取得または作成
                user_credit, created = UserCredit.objects.get_or_create(
                    user_id=user_id,
                    defaults={'credit_balance': 0}
                )
                
                # クレジット追加
                old_balance = user_credit.credit_balance
                user_credit.add_credits(amount)
                
                # 取引履歴を記録
                CreditTransaction.objects.create(
                    user_id=user_id,
                    transaction_type=transaction_type,
                    amount=amount,
                    balance_after=user_credit.credit_balance,
                    description=description or f"クレジット追加: {amount}"
                )
                
                logger.info(f"Credits added: User {user_id}, Amount: {amount}, Balance: {old_balance} -> {user_credit.credit_balance}")
                return True, f"クレジットを追加しました: +{amount} (残高: {user_credit.credit_balance})"
                
        except Exception as e:
            logger.error(f"Credit addition failed: User {user_id}, Error: {str(e)}")
            return False, f"クレジット追加エラー: {str(e)}"

    @staticmethod
    def get_credit_history(user_id: str, limit: int = 50) -> list:
        """
        クレジット取引履歴を取得
        
        Args:
            user_id: ユーザーID
            limit: 取得件数制限
            
        Returns:
            list: 取引履歴リスト
        """
        try:
            transactions = CreditTransaction.objects.filter(
                user_id=user_id
            ).order_by('-created_at')[:limit]
            
            return [
                {
                    'id': tx.id,
                    'transaction_type': tx.transaction_type,
                    'amount': tx.amount,
                    'balance_after': tx.balance_after,
                    'description': tx.description,
                    'created_at': tx.created_at.isoformat()
                }
                for tx in transactions
            ]
            
        except Exception as e:
            logger.error(f"Failed to get credit history: User {user_id}, Error: {str(e)}")
            return []

    @staticmethod
    def migrate_phone_user_to_unified(firebase_uid: str) -> Tuple[bool, str]:
        """
        PhoneUserのクレジットを統一システムに移行
        
        Args:
            firebase_uid: Firebase UID
            
        Returns:
            Tuple[bool, str]: (成功/失敗, メッセージ)
        """
        try:
            with transaction.atomic():
                # PhoneUserを取得
                phone_user = PhoneUser.objects.get(firebase_uid=firebase_uid)
                
                # 統一システムに既存のレコードがあるかチェック
                user_credit, created = UserCredit.objects.get_or_create(
                    user_id=firebase_uid,
                    defaults={'credit_balance': 0}
                )
                
                if not created:
                    return False, f"既に統一システムに移行済みです (残高: {user_credit.credit_balance})"
                
                # PhoneUserは移行済みとしてマーク（creditsフィールドは削除済み）
                logger.info(f"PhoneUser {firebase_uid} migrated to unified system: 0 credits")
                return True, f"統一システムに移行しました: 0 クレジット"
                
        except PhoneUser.DoesNotExist:
            return False, f"PhoneUser {firebase_uid} が見つかりません"
        except Exception as e:
            logger.error(f"Migration failed: {firebase_uid}, Error: {str(e)}")
            return False, f"移行エラー: {str(e)}"