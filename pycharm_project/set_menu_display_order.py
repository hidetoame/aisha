#!/usr/bin/env python
"""
既存のメニューデータにdisplay_orderを設定するスクリプト
使用方法: python set_menu_display_order.py
"""

import os
import sys
import django

# Django設定を読み込み
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_project.settings')
django.setup()

from api.models.menu import Menu

def set_menu_display_order():
    """既存のメニューデータにdisplay_orderを設定"""
    print('🔄 既存のメニューデータにdisplay_orderを設定中...')
    
    # 全メニューを取得（ID順）
    menus = Menu.objects.all().order_by('id')
    
    if not menus.exists():
        print('✅ メニューデータが存在しません')
        return
    
    # 各メニューに順番にdisplay_orderを設定
    for index, menu in enumerate(menus):
        menu.display_order = index * 10  # 10刻みで設定（後で間に挿入可能）
        menu.save()
        print(f'✅ メニュー "{menu.name}" (ID: {menu.id}) のdisplay_orderを {index * 10} に設定')
    
    print(f'✅ {menus.count()}件のメニューのdisplay_order設定が完了しました')

if __name__ == '__main__':
    set_menu_display_order() 