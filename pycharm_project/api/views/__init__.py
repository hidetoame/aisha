from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def health_check(request):
    """Render用のヘルスチェックエンドポイント"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'AISHA Backend',
        'version': '1.0.0'
    })
