import os
import json
import stripe
from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import logging

from api.models.payment_log import PaymentLog

logger = logging.getLogger(__name__)

# Stripe設定
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """
    Stripe Webhookエンドポイント
    本番環境での決済結果を受け取る
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    # 環境判定
    if settings.DEBUG:
        logger.info("ローカル環境: Webhookは無効化されています")
        return Response({
            'success': False,
            'error': 'ローカル環境ではWebhookは無効です'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Webhookシークレットを取得
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        if not webhook_secret:
            logger.error("STRIPE_WEBHOOK_SECRETが設定されていません")
            return Response({
                'success': False,
                'error': 'Webhook設定エラー'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 署名を検証
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        logger.info(f"Webhook受信: {event['type']}")
        
        # 生データをログに保存
        PaymentLog.objects.create(
            payment_intent_id=event.get('data', {}).get('object', {}).get('id', 'unknown'),
            status='pending',
            amount=0,
            currency='jpy',
            webhook_event_type=event['type'],
            raw_data=event
        )
        
    except ValueError as e:
        logger.error(f"Webhook署名検証エラー: {str(e)}")
        return Response({
            'success': False,
            'error': '署名検証エラー'
        }, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe署名検証エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'Stripe署名検証エラー'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # イベントタイプに応じた処理
    if event['type'] == 'payment_intent.succeeded':
        return handle_payment_success(event)
    elif event['type'] == 'payment_intent.payment_failed':
        return handle_payment_failure(event)
    elif event['type'] == 'charge.succeeded':
        return handle_charge_success(event)
    elif event['type'] == 'charge.failed':
        return handle_charge_failure(event)
    else:
        logger.info(f"未処理のイベントタイプ: {event['type']}")
        return Response({'success': True, 'message': 'イベント受信済み'})
    
    return Response({'success': True})

def handle_payment_success(event):
    """決済成功時の処理"""
    try:
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent['id']
        amount = payment_intent['amount']
        currency = payment_intent['currency']
        customer_id = payment_intent.get('customer')
        
        logger.info(f"決済成功: {payment_intent_id}, 金額: {amount} {currency}")
        
        # TODO: データベースに決済成功を記録
        # TODO: ユーザーのクレジットを更新
        # TODO: 関連する処理を実行
        
        # 決済ログを保存
        save_payment_log(payment_intent_id, 'success', amount, currency, customer_id)
        
        return Response({
            'success': True,
            'message': '決済成功を処理しました'
        })
        
    except Exception as e:
        logger.error(f"決済成功処理エラー: {str(e)}")
        return Response({
            'success': False,
            'error': '決済成功処理エラー'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def handle_payment_failure(event):
    """決済失敗時の処理"""
    try:
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent['id']
        last_payment_error = payment_intent.get('last_payment_error', {})
        error_message = last_payment_error.get('message', '不明なエラー')
        
        logger.warning(f"決済失敗: {payment_intent_id}, エラー: {error_message}")
        
        # TODO: データベースに決済失敗を記録
        # TODO: ユーザーに通知
        
        # 決済ログを保存
        save_payment_log(payment_intent_id, 'failed', 0, 'jpy', None, error_message)
        
        return Response({
            'success': True,
            'message': '決済失敗を処理しました'
        })
        
    except Exception as e:
        logger.error(f"決済失敗処理エラー: {str(e)}")
        return Response({
            'success': False,
            'error': '決済失敗処理エラー'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def handle_charge_success(event):
    """チャージ成功時の処理"""
    try:
        charge = event['data']['object']
        charge_id = charge['id']
        amount = charge['amount']
        currency = charge['currency']
        
        logger.info(f"チャージ成功: {charge_id}, 金額: {amount} {currency}")
        
        # TODO: チャージ成功の処理
        
        return Response({
            'success': True,
            'message': 'チャージ成功を処理しました'
        })
        
    except Exception as e:
        logger.error(f"チャージ成功処理エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'チャージ成功処理エラー'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def handle_charge_failure(event):
    """チャージ失敗時の処理"""
    try:
        charge = event['data']['object']
        charge_id = charge['id']
        failure_message = charge.get('failure_message', '不明なエラー')
        
        logger.warning(f"チャージ失敗: {charge_id}, エラー: {failure_message}")
        
        # TODO: チャージ失敗の処理
        
        return Response({
            'success': True,
            'message': 'チャージ失敗を処理しました'
        })
        
    except Exception as e:
        logger.error(f"チャージ失敗処理エラー: {str(e)}")
        return Response({
            'success': False,
            'error': 'チャージ失敗処理エラー'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def save_payment_log(payment_intent_id, status, amount, currency, customer_id, error_message=None):
    """決済ログを保存"""
    try:
        # 既存のログを更新
        payment_log = PaymentLog.objects.filter(
            payment_intent_id=payment_intent_id
        ).first()
        
        if payment_log:
            payment_log.status = status
            payment_log.amount = amount
            payment_log.currency = currency
            payment_log.customer_id = customer_id
            payment_log.error_message = error_message
            payment_log.processed = True
            payment_log.save()
        else:
            # 新規作成
            PaymentLog.objects.create(
                payment_intent_id=payment_intent_id,
                status=status,
                amount=amount,
                currency=currency,
                customer_id=customer_id,
                error_message=error_message,
                processed=True
            )
        
        logger.info(f"決済ログ保存: {payment_intent_id} - {status}")
    except Exception as e:
        logger.error(f"決済ログ保存エラー: {str(e)}") 