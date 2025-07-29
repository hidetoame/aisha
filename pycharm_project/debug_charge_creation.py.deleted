#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta

# Django設定を読み込み
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.credit_charge import CreditCharge

def debug_charge_creation():
    print("=== チャージ作成の重複調査 ===")
    print()
    
    # 最新の10件のチャージレコードを取得
    recent_charges = CreditCharge.objects.order_by('-created_at')[:10]
    
    print(f"最新のチャージレコード数: {recent_charges.count()}")
    print()
    
    # 各レコードの詳細を表示
    for i, charge in enumerate(recent_charges, 1):
        print(f"【{i}件目】")
        print(f"  ID: {charge.id}")
        print(f"  ユーザーID: {charge.user_id}")
        print(f"  チャージ金額: ¥{charge.charge_amount}")
        print(f"  クレジット金額: {charge.credit_amount}")
        print(f"  ステータス: {charge.payment_status}")
        print(f"  作成日時: {charge.created_at}")
        print(f"  Stripe PaymentIntent ID: {charge.stripe_payment_intent_id}")
        print()
    
    # 同じユーザーで同じ金額のチャージが短時間で作成されているかをチェック
    print("=== 重複チェック ===")
    
    # 過去1時間以内のチャージを取得
    one_hour_ago = datetime.now() - timedelta(hours=1)
    recent_charges_1h = CreditCharge.objects.filter(created_at__gte=one_hour_ago)
    
    # ユーザーIDとチャージ金額でグループ化
    user_amount_groups = {}
    for charge in recent_charges_1h:
        key = (charge.user_id, charge.charge_amount, charge.credit_amount)
        if key not in user_amount_groups:
            user_amount_groups[key] = []
        user_amount_groups[key].append(charge)
    
    # 重複があるグループを表示
    duplicates_found = False
    for (user_id, charge_amount, credit_amount), charges in user_amount_groups.items():
        if len(charges) > 1:
            duplicates_found = True
            print(f"⚠️  重複発見: ユーザー {user_id}, 金額 ¥{charge_amount}, クレジット {credit_amount}")
            print(f"   作成されたレコード数: {len(charges)}")
            for charge in charges:
                print(f"     - ID: {charge.id}, 作成時刻: {charge.created_at}, ステータス: {charge.payment_status}")
            print()
    
    if not duplicates_found:
        print("✅ 重複は見つかりませんでした")
    
    # 過去24時間の統計
    print("=== 過去24時間の統計 ===")
    one_day_ago = datetime.now() - timedelta(days=1)
    charges_24h = CreditCharge.objects.filter(created_at__gte=one_day_ago)
    
    print(f"過去24時間の総チャージ数: {charges_24h.count()}")
    print(f"pending: {charges_24h.filter(payment_status='pending').count()}")
    print(f"succeeded: {charges_24h.filter(payment_status='succeeded').count()}")
    print(f"failed: {charges_24h.filter(payment_status='failed').count()}")
    
    # ユーザー別の統計
    print("\n=== ユーザー別統計（過去24時間） ===")
    user_stats = {}
    for charge in charges_24h:
        if charge.user_id not in user_stats:
            user_stats[charge.user_id] = {'total': 0, 'pending': 0, 'succeeded': 0, 'failed': 0}
        user_stats[charge.user_id]['total'] += 1
        user_stats[charge.user_id][charge.payment_status] += 1
    
    for user_id, stats in user_stats.items():
        print(f"ユーザー {user_id}:")
        print(f"  総数: {stats['total']}, pending: {stats['pending']}, succeeded: {stats['succeeded']}, failed: {stats['failed']}")

if __name__ == "__main__":
    debug_charge_creation() 