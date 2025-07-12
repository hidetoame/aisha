from django.contrib import admin
from api.models.category import Category
from api.models.menu import Menu
from api.models.prompt_variable import PromptVariable

# モデルごとに簡易管理画面追加
admin.site.register(Category)
admin.site.register(Menu)
admin.site.register(PromptVariable)
