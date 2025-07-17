from django.db import models
from django.db.models import CharField, TextField


class Category(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(default="", blank=True)
    order_index = models.IntegerField(default=0)

    class Meta:
        ordering = ['order_index', 'id']

    # DBへの保存時の変換処理
    # 変換処理が「データとしての整合性や制約」なら ここに書く。
    # 変換処理が「ビジネスロジック（アプリケーション都合）」なら views.perform_XX() や serializer.create/update() に書く。
    def save(self, *args, **kwargs):
        # CharFieldやTextFieldにNoneが指定された&Noneを許容していない場合は自動的に空文字に変換
        for field in self._meta.get_fields():
            if isinstance(field, (CharField, TextField)) and not field.null:
                value = getattr(self, field.name)
                if value is None:
                    setattr(self, field.name, "")
        super().save(*args, **kwargs)
