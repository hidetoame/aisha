import stripe
import logging
from django.conf import settings
from decimal import Decimal
from typing import Dict, Optional, Tuple
from ..models import CreditCharge, UserCredit, CreditTransaction

# Stripe API キーの設定
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)

logger = logging.getLogger(__name__)


class StripeService:
    """Stripe決済サービスクラス"""
    
    @staticmethod
    def create_payment_intent(
        amount: Decimal, 
        currency: str = 'jpy',
        metadata: Optional[Dict] = None
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Stripe PaymentIntentを作成
        
        Args:
            amount: 決済金額（円）
            currency: 通貨（デフォルト: jpy）
            metadata: メタデータ
            
        Returns:
            Tuple[payment_intent_id, client_secret, error_message]
        """
        try:
            # 金額を銭単位に変換（JPYの場合は整数）
            amount_cents = int(amount)
            
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                automatic_payment_methods={
                    'enabled': True,
                },
                metadata=metadata or {}
            )
            
            logger.info(f"PaymentIntent created: {payment_intent.id}")
            return payment_intent.id, payment_intent.client_secret, None
            
        except stripe.error.StripeError as e:
            error_msg = f"Stripe error: {str(e)}"
            logger.error(error_msg)
            return None, None, error_msg
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return None, None, error_msg
    
    @staticmethod
    def retrieve_payment_intent(payment_intent_id: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        PaymentIntentの情報を取得
        
        Args:
            payment_intent_id: PaymentIntent ID
            
        Returns:
            Tuple[payment_intent_data, error_message]
        """
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                'id': payment_intent.id,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                'status': payment_intent.status,
                'metadata': payment_intent.metadata,
                'created': payment_intent.created,
            }, None
            
        except stripe.error.StripeError as e:
            error_msg = f"Stripe error: {str(e)}"
            logger.error(error_msg)
            return None, error_msg
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return None, error_msg


class CreditChargeService:
    """クレジットチャージサービスクラス"""
    
    @staticmethod
    def create_charge_request(user_id: str, charge_amount: Decimal, credit_amount: int) -> Tuple[Optional[CreditCharge], Optional[str]]:
        """
        チャージリクエストを作成してStripe PaymentIntentを生成
        
        Args:
            user_id: ユーザーID
            charge_amount: チャージ金額
            credit_amount: 付与クレジット
            
        Returns:
            Tuple[CreditCharge, error_message]
        """
        try:
            # 既存のpendingレコードをチェック（過去1分以内）
            from datetime import datetime, timedelta
            one_minute_ago = datetime.now() - timedelta(minutes=1)
            
            existing_charge = CreditCharge.objects.filter(
                user_id=user_id,
                charge_amount=charge_amount,
                credit_amount=credit_amount,
                payment_status='pending',
                created_at__gte=one_minute_ago
            ).order_by('-created_at').first()
            
            if existing_charge:
                logger.info(f"既存のpendingレコードを返却: {existing_charge.id} (作成時刻: {existing_charge.created_at})")
                return existing_charge, None
            
            # メタデータ準備
            metadata = {
                'user_id': user_id,
                'credit_amount': str(credit_amount),
                'service': 'aisha_credit_charge'
            }
            
            # Stripe PaymentIntent作成
            payment_intent_id, client_secret, error = StripeService.create_payment_intent(
                amount=charge_amount,
                metadata=metadata
            )
            
            if error:
                return None, error
            
            # データベースにチャージ記録を作成
            charge = CreditCharge.objects.create(
                user_id=user_id,
                charge_amount=charge_amount,
                credit_amount=credit_amount,
                stripe_payment_intent_id=payment_intent_id,
                stripe_client_secret=client_secret,
                stripe_metadata=metadata,
                payment_status='pending'
            )
            
            logger.info(f"Charge request created: {charge.id} for user {user_id}")
            return charge, None
            
        except Exception as e:
            error_msg = f"Failed to create charge request: {str(e)}"
            logger.error(error_msg)
            return None, error_msg
    
    @staticmethod
    def confirm_payment(payment_intent_id: str) -> Tuple[bool, Optional[str]]:
        """
        決済完了処理
        
        Args:
            payment_intent_id: PaymentIntent ID
            
        Returns:
            Tuple[success, error_message]
        """
        try:
            # PaymentIntentの情報を取得
            payment_data, error = StripeService.retrieve_payment_intent(payment_intent_id)
            if error:
                return False, error
            
            # データベースからチャージ記録を取得
            try:
                charge = CreditCharge.objects.get(stripe_payment_intent_id=payment_intent_id)
            except CreditCharge.DoesNotExist:
                return False, f"Charge record not found for payment_intent: {payment_intent_id}"
            
            # 決済ステータスによる処理
            if payment_data['status'] == 'succeeded':
                # 決済成功時の処理
                return CreditChargeService._process_successful_payment(charge)
            
            elif payment_data['status'] in ['canceled', 'failed']:
                # 決済失敗時の処理
                charge.mark_failed(f"Payment {payment_data['status']}")
                return False, f"Payment {payment_data['status']}"
            
            else:
                # その他のステータス（処理中など）
                return False, f"Payment status: {payment_data['status']}"
                
        except Exception as e:
            error_msg = f"Failed to confirm payment: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    @staticmethod
    def _process_successful_payment(charge: CreditCharge) -> Tuple[bool, Optional[str]]:
        """
        決済成功時の処理（クレジット付与など）
        
        Args:
            charge: チャージ記録
            
        Returns:
            Tuple[success, error_message]
        """
        try:
            # ユーザークレジット残高を取得または作成
            user_credit, created = UserCredit.objects.get_or_create(
                user_id=charge.user_id,
                defaults={'credit_balance': 0}
            )
            
            # クレジットを追加
            old_balance = user_credit.credit_balance
            user_credit.add_credits(charge.credit_amount)
            
            # 取引履歴を記録
            CreditTransaction.objects.create(
                user_id=charge.user_id,
                transaction_type='charge',
                amount=charge.credit_amount,
                balance_after=user_credit.credit_balance,
                charge=charge,
                description=f"チャージ: ¥{charge.charge_amount}"
            )
            
            # チャージ記録を完了としてマーク
            charge.mark_completed('succeeded')
            
            logger.info(
                f"Payment processed successfully: User {charge.user_id}, "
                f"Amount: ¥{charge.charge_amount}, Credits: {charge.credit_amount}, "
                f"Balance: {old_balance} -> {user_credit.credit_balance}"
            )
            
            return True, None
            
        except Exception as e:
            error_msg = f"Failed to process successful payment: {str(e)}"
            logger.error(error_msg)
            # エラーの場合はチャージ記録を失敗としてマーク
            charge.mark_failed(error_msg)
            return False, error_msg
