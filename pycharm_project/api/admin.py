from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from api.models.category import Category
from api.models.menu import Menu
from api.models.prompt_variable import PromptVariable
from api.models.user_profile import UserProfile


class UserProfileInline(admin.StackedInline):
    """ユーザープロフィールをユーザー管理画面に表示"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'プロフィール'


class UserAdmin(BaseUserAdmin):
    """ユーザー管理画面をカスタマイズ"""
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_is_admin')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'profile__is_admin')
    
    def get_is_admin(self, obj):
        """管理者フラグを表示"""
        return obj.profile.is_admin if hasattr(obj, 'profile') else False
    get_is_admin.short_description = '管理者フラグ'
    get_is_admin.boolean = True


# デフォルトのUser管理画面を削除して、カスタムUserAdminを登録
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# 独立したUserProfile管理画面も追加
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_admin', 'frontend_user_id', 'created_at')
    list_filter = ('is_admin', 'created_at')
    search_fields = ('user__username', 'user__email', 'frontend_user_id')
    readonly_fields = ('created_at', 'updated_at')

# モデルごとに簡易管理画面追加
admin.site.register(Category)
admin.site.register(Menu)
admin.site.register(PromptVariable)
