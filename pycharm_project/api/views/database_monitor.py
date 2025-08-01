from django.http import JsonResponse
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime

@csrf_exempt
@require_http_methods(["GET"])
def check_drop_attempts(request):
    """DROP DATABASE試行を監視するエンドポイント"""
    
    with connection.cursor() as cursor:
        # 監査ログテーブルが存在する場合のみチェック
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'database_audit_log'
            );
        """)
        
        if cursor.fetchone()[0]:
            # 最近のDROP試行を取得
            cursor.execute("""
                SELECT 
                    event_time,
                    user_name,
                    client_addr,
                    command_tag,
                    query
                FROM database_audit_log
                WHERE command_tag LIKE 'DROP%'
                ORDER BY event_time DESC
                LIMIT 10;
            """)
            
            attempts = []
            for row in cursor.fetchall():
                attempts.append({
                    'time': row[0].isoformat() if row[0] else None,
                    'user': row[1],
                    'ip_address': str(row[2]) if row[2] else None,
                    'command': row[3],
                    'query': row[4]
                })
            
            return JsonResponse({
                'status': 'monitored',
                'recent_drop_attempts': attempts,
                'total_attempts': len(attempts)
            })
        
    return JsonResponse({
        'status': 'not_monitored',
        'message': 'Audit log table not found'
    })