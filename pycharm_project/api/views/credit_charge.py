from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
import logging

from ..serializers.credit_charge import (
    CreditChargeRequestSerializer,
    CreditChargeSerializer,
    UserCreditSerializer,
    CreditTransactionSerializer,
    StripePaymentIntentSerializer,
    PaymentConfirmSerializer
)
from ..services.credit_charge_service import CreditChargeService
from ..models import CreditCharge, UserCredit, CreditTransaction

logger = logging.getLogger(__name__)


class CreditChargeCreateView(APIView):
    """クレジットチャージ作成API"""
    
    def post(self, request):
        """
        チャージリクエストを作成してStripe PaymentIntentを返す
        
        Request Body:
        {
            "user_id": "12345",
            "charge_amount": 500.00,
            "credit_amount": 500
        }
        
        Response:
        {
            "charge_id": 1,
            "payment_intent_id": "pi_xxxxx",
            "client_secret": "pi_xxxxx_secret_xxxxx",
            "amount": 500.00,
            "status": "pending"
        }
        """
        serializer = CreditChargeRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = serializer.validated_data['user_id']
        charge_amount = serializer.validated_data['charge_amount']
        credit_amount = serializer.validated_data['credit_amount']
        
        # チャージリクエスト作成
        charge, error = CreditChargeService.create_charge_request(
            user_id=user_id,
            charge_amount=charge_amount,
            credit_amount=credit_amount
        )
        
        if error:
            logger.error(f"Failed to create charge: {error}")
            return Response(
                {'error': 'Failed to create charge', 'message': error},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # レスポンスデータ
        response_data = {
            'charge_id': charge.id,
            'payment_intent_id': charge.stripe_payment_intent_id,
            'client_secret': charge.stripe_client_secret,
            'amount': float(charge.charge_amount),
            'credit_amount': charge.credit_amount,
            'status': charge.payment_status,
            'created_at': charge.created_at.isoformat()
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class PaymentConfirmView(APIView):
    """決済確認API"""
    
    def post(self, request):
        """
        決済完了確認とクレジット付与
        
        Request Body:
        {
            "payment_intent_id": "pi_xxxxx",
            "user_id": "12345"
        }
        
        Response:
        {
            "success": true,
            "message": "Payment confirmed and credits added",
            "credit_balance": 1500
        }
        """
        serializer = PaymentConfirmSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment_intent_id = serializer.validated_data['payment_intent_id']
        user_id = serializer.validated_data['user_id']
        
        # 決済確認処理
        success, error = CreditChargeService.confirm_payment(payment_intent_id)
        
        if not success:
            logger.error(f"Payment confirmation failed: {error}")
            return Response(
                {'error': 'Payment confirmation failed', 'message': error},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ユーザーの現在のクレジット残高を取得
        try:
            user_credit = UserCredit.objects.get(user_id=user_id)
            credit_balance = user_credit.credit_balance
        except UserCredit.DoesNotExist:
            credit_balance = 0
        
        response_data = {
            'success': True,
            'message': 'Payment confirmed and credits added',
            'credit_balance': credit_balance
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class UserCreditView(APIView):
    """ユーザークレジット情報API"""
    
    def get(self, request, user_id):
        """
        ユーザーのクレジット残高を取得
        
        Response:
        {
            "user_id": "12345",
            "credit_balance": 1500,
            "created_at": "2025-07-13T10:00:00Z",
            "updated_at": "2025-07-13T15:30:00Z"
        }
        """
        try:
            user_credit = UserCredit.objects.get(user_id=user_id)
            serializer = UserCreditSerializer(user_credit)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserCredit.DoesNotExist:
            return Response(
                {
                    'user_id': user_id,
                    'credit_balance': 0,
                    'message': 'User credit record not found'
                },
                status=status.HTTP_200_OK
            )


class CreditTransactionHistoryView(APIView):
    """クレジット取引履歴API"""
    
    def get(self, request, user_id):
        """
        ユーザーのクレジット取引履歴を取得
        
        Query Parameters:
        - limit: 取得件数（デフォルト: 20）
        - offset: オフセット（デフォルト: 0）
        
        Response:
        {
            "count": 5,
            "results": [
                {
                    "id": 1,
                    "transaction_type": "charge",
                    "amount": 500,
                    "balance_after": 1500,
                    "description": "チャージ: ¥500",
                    "created_at": "2025-07-13T15:30:00Z"
                },
                ...
            ]
        }
        """
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        
        transactions = CreditTransaction.objects.filter(
            user_id=user_id
        ).order_by('-created_at')[offset:offset + limit]
        
        total_count = CreditTransaction.objects.filter(user_id=user_id).count()
        
        serializer = CreditTransactionSerializer(transactions, many=True)
        
        response_data = {
            'count': total_count,
            'results': serializer.data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
def stripe_config(request):
    """
    Stripe設定情報を取得（フロントエンド用）
    
    Response:
    {
        "publishable_key": "pk_test_xxxxx"
    }
    """
    return Response({
        'publishable_key': getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
    })


class ChargeHistoryView(APIView):
    """チャージ履歴API"""
    
    def get(self, request, user_id):
        """
        ユーザーのチャージ履歴を取得
        
        Query Parameters:
        - limit: 取得件数（デフォルト: 20）
        - offset: オフセット（デフォルト: 0）
        - status: ステータスフィルター（succeeded, failed, pending など）
        
        Response:
        {
            "count": 3,
            "results": [
                {
                    "id": 1,
                    "charge_amount": 500.00,
                    "credit_amount": 500,
                    "payment_status": "succeeded",
                    "created_at": "2025-07-13T15:30:00Z",
                    "completed_at": "2025-07-13T15:31:00Z"
                },
                ...
            ]
        }
        """
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        status_filter = request.query_params.get('status')
        
        charges = CreditCharge.objects.filter(user_id=user_id)
        
        if status_filter:
            charges = charges.filter(payment_status=status_filter)
        
        charges = charges.order_by('-created_at')[offset:offset + limit]
        total_count = CreditCharge.objects.filter(user_id=user_id).count()
        
        serializer = CreditChargeSerializer(charges, many=True)
        
        response_data = {
            'count': total_count,
            'results': serializer.data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
