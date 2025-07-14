# Generated manually for UserProfile model

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0007_comment_like'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_admin', models.BooleanField(default=False, verbose_name='管理者フラグ')),
                ('frontend_user_id', models.CharField(blank=True, max_length=100, verbose_name='フロントエンドユーザーID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='作成日時')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新日時')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'ユーザープロフィール',
                'verbose_name_plural': 'ユーザープロフィール',
                'db_table': 'user_profiles',
            },
        ),
        migrations.AddIndex(
            model_name='userprofile',
            index=models.Index(fields=['frontend_user_id'], name='user_profil_fronten_6b6b44_idx'),
        ),
        migrations.AddIndex(
            model_name='userprofile',
            index=models.Index(fields=['is_admin'], name='user_profil_is_admi_4e4e87_idx'),
        ),
    ]