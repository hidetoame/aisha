#!/usr/bin/env python
import os
import sys
import django

# Django設定を読み込み
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models import CarSettings

print("=== CarSettings Records ===")
car_settings = CarSettings.objects.all()

if car_settings.exists():
    print(f"Found {car_settings.count()} records:")
    for i, cs in enumerate(car_settings, 1):
        print(f"{i}. ID: {cs.id}")
        print(f"   User ID: {cs.user_id}")
        print(f"   Car ID: {cs.car_id}")
        print(f"   License Plate: {cs.license_plate_text}")
        print(f"   Car Name: {cs.car_name}")
        print(f"   Created: {cs.created_at}")
        print(f"   Updated: {cs.updated_at}")
        print("   ---")
else:
    print("No CarSettings records found in database!")

print(f"\nTotal records: {car_settings.count()}") 