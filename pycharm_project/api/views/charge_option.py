from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
import logging

from ..models import ChargeOption
from ..serializers.charge_option import (
    ChargeOptionSerializer,
    ChargeOptionCreateSerializer,
    ChargeOptionUpdateSerializer
)

logger = logging.getLogger(__name__)


class ChargeOptionListView(APIView):
    """チャージオプション一覧取得API"""
    
    def get(self, request):
        """
        アクティブなチャージオプション一覧を取得
        
        Query Parameters:
        - is_active: アクティブフラグでフィルター（デフォルト: true）
        
        Response:
        [
            {
                "id": 1,
                "name": "お試し最適",
                "description": "+10 お得",
                "price_yen": "1000.00",
                "credits_awarded": 1000,
                "credits_bonus": 10,
                "total_credits": 1010,
                "display_info": "+10 お得",
                "display_order": 1,
                "is_active": true,
                "is_popular": false
            },
            ...
        ]
        """
        # クエリパラメータから is_active を取得（デフォルト: true）
        is_active = request.query_params.get('is_active', 'true').lower() == 'true'
        
        # チャージオプションを取得
        queryset = ChargeOption.objects.all()
        if is_active:
            queryset = queryset.filter(is_active=True)
        
        queryset = queryset.order_by('display_order', 'price_yen')
        
        serializer = ChargeOptionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """
        新しいチャージオプションを作成
        
        Request Body:
        {
            "name": "お試し最適",
            "description": "+10 お得",
            "price_yen": 1000.00,
            "credits_awarded": 1000,
            "credits_bonus": 10,
            "display_order": 1,
            "is_active": true,
            "is_popular": false
        }
        """
        serializer = ChargeOptionCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.error(f"❌ Invalid charge option data: {serializer.errors}")
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        charge_option = serializer.save()
        response_serializer = ChargeOptionSerializer(charge_option)
        
        logger.info(f"✅ Created charge option: {charge_option.name} - ¥{charge_option.price_yen}")
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ChargeOptionDetailView(APIView):
    """チャージオプション詳細API"""
    
    def get(self, request, pk):
        """
        特定のチャージオプション詳細を取得
        
        Response:
        {
            "id": 1,
            "name": "お試し最適",
            "description": "+10 お得", 
            "price_yen": "1000.00",
            "credits_awarded": 1000,
            "credits_bonus": 10,
            "total_credits": 1010,
            "display_info": "+10 お得",
            "display_order": 1,
            "is_active": true,
            "is_popular": false
        }
        """
        charge_option = get_object_or_404(ChargeOption, pk=pk)
        serializer = ChargeOptionSerializer(charge_option)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, pk):
        """
        チャージオプションを更新
        
        Request Body:
        {
            "name": "お試し最適",
            "description": "+15 お得",
            "price_yen": 1000.00,
            "credits_awarded": 1000,
            "credits_bonus": 15,
            "display_order": 1,
            "is_active": true,
            "is_popular": false
        }
        """
        charge_option = get_object_or_404(ChargeOption, pk=pk)
        serializer = ChargeOptionUpdateSerializer(charge_option, data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_charge_option = serializer.save()
        response_serializer = ChargeOptionSerializer(updated_charge_option)
        
        logger.info(f"✅ Updated charge option: {updated_charge_option.name} - ¥{updated_charge_option.price_yen}")
        
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request, pk):
        """
        チャージオプションを削除（論理削除 - is_activeをFalseに設定）
        
        Response:
        {
            "message": "Charge option deleted successfully",
            "deleted_id": 1
        }
        """
        charge_option = get_object_or_404(ChargeOption, pk=pk)
        
        # 論理削除（is_activeをFalseに設定）
        charge_option.is_active = False
        charge_option.save()
        
        logger.info(f"✅ Deleted (deactivated) charge option: {charge_option.name}")
        
        return Response({
            'message': 'Charge option deleted successfully',
            'deleted_id': charge_option.id
        }, status=status.HTTP_200_OK)


class ChargeOptionCreateView(APIView):
    """チャージオプション作成API（管理者用）"""
    
    permission_classes = [IsAuthenticated]  # 認証が必要
    
    def post(self, request):
        """
        新しいチャージオプションを作成
        
        Request Body:
        {
            "name": "お試し最適",
            "description": "+10 お得",
            "price_yen": 1000.00,
            "credits_awarded": 1000,
            "credits_bonus": 10,
            "display_order": 1,
            "is_active": true,
            "is_popular": false
        }
        
        Response:
        {
            "id": 1,
            "name": "お試し最適",
            "description": "+10 お得",
            "price_yen": "1000.00",
            "credits_awarded": 1000,
            "credits_bonus": 10,
            "total_credits": 1010,
            "display_info": "+10 お得",
            "display_order": 1,
            "is_active": true,
            "is_popular": false
        }
        """
        serializer = ChargeOptionCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.error(f"❌ Invalid charge option data: {serializer.errors}")
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        charge_option = serializer.save()
        response_serializer = ChargeOptionSerializer(charge_option)
        
        logger.info(f"✅ Created charge option: {charge_option.name} - ¥{charge_option.price_yen}")
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ChargeOptionUpdateView(APIView):
    """チャージオプション更新API（管理者用）"""
    
    permission_classes = [IsAuthenticated]  # 認証が必要
    
    def put(self, request, pk):
        """
        チャージオプションを更新
        
        Request Body:
        {
            "name": "お試し最適",
            "description": "+15 お得",
            "price_yen": 1000.00,
            "credits_awarded": 1000,
            "credits_bonus": 15,
            "display_order": 1,
            "is_active": true,
            "is_popular": false
        }
        """
        charge_option = get_object_or_404(ChargeOption, pk=pk)
        serializer = ChargeOptionUpdateSerializer(charge_option, data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid request data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_charge_option = serializer.save()
        response_serializer = ChargeOptionSerializer(updated_charge_option)
        
        logger.info(f"✅ Updated charge option: {updated_charge_option.name} - ¥{updated_charge_option.price_yen}")
        
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ChargeOptionDeleteView(APIView):
    """チャージオプション削除API（管理者用）"""
    
    permission_classes = [IsAuthenticated]  # 認証が必要
    
    def delete(self, request, pk):
        """
        チャージオプションを削除（論理削除 - is_activeをFalseに設定）
        
        Response:
        {
            "message": "Charge option deleted successfully",
            "deleted_id": 1
        }
        """
        charge_option = get_object_or_404(ChargeOption, pk=pk)
        
        # 論理削除（is_activeをFalseに設定）
        charge_option.is_active = False
        charge_option.save()
        
        logger.info(f"✅ Deleted (deactivated) charge option: {charge_option.name}")
        
        return Response({
            'message': 'Charge option deleted successfully',
            'deleted_id': charge_option.id
        }, status=status.HTTP_200_OK)