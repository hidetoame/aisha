from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from datetime import datetime
import logging

from api.serializers.sales_management import MonthlySummarySerializer, MonthlyDetailSerializer
from api.models.credit_charge import CreditCharge

logger = logging.getLogger(__name__)


class SalesManagementView(APIView):
    """売上管理ビュー"""
    
    def get(self, request):
        """月別集計を取得"""
        try:
            # 月別集計クエリ
            monthly_summary = CreditCharge.objects.annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                year=Count('id', filter=Q(created_at__year=2025)),  # 仮の年
                success_count=Count('id', filter=Q(payment_status='succeeded')),
                success_credit_total=Sum('credit_amount', filter=Q(payment_status='succeeded')),
                success_point_total=Sum('charge_amount', filter=Q(payment_status='succeeded')),
                pending_count=Count('id', filter=Q(payment_status='pending'))
            ).order_by('-month')
            
            # データを整形
            summary_data = []
            for item in monthly_summary:
                if item['month']:
                    summary_data.append({
                        'year': item['month'].year,
                        'month': item['month'].month,
                        'success_count': item['success_count'] or 0,
                        'success_credit_total': item['success_credit_total'] or 0,
                        'success_point_total': item['success_point_total'] or 0,
                        'pending_count': item['pending_count'] or 0
                    })
            
            # シリアライザーでレスポンス作成
            serializer = MonthlySummarySerializer(summary_data, many=True)
            
            logger.info(f"月別集計取得成功: {len(summary_data)}件")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"月別集計取得エラー: {str(e)}")
            return Response(
                {'error': '月別集計の取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SalesMonthlyDetailView(APIView):
    """月別詳細ビュー"""
    
    def get(self, request):
        """指定月の詳細を取得"""
        try:
            year = request.query_params.get('year')
            month = request.query_params.get('month')
            status_filter = request.query_params.get('status', 'succeeded')  # デフォルト: 成功
            
            if not year or not month:
                return Response(
                    {'error': '年と月の指定が必要です'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # クエリセット作成
            queryset = CreditCharge.objects.filter(
                created_at__year=year,
                created_at__month=month
            )
            
            # ステータスフィルター適用
            if status_filter in ['succeeded', 'pending']:
                queryset = queryset.filter(payment_status=status_filter)
            
            # 最新順でソート
            queryset = queryset.order_by('-created_at')
            
            # シリアライザーでレスポンス作成
            serializer = MonthlyDetailSerializer(queryset, many=True)
            
            logger.info(f"月別詳細取得成功: {year}年{month}月, ステータス:{status_filter}, 件数:{queryset.count()}")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"月別詳細取得エラー: {str(e)}")
            return Response(
                {'error': '月別詳細の取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 