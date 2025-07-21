from django.db import models

from api.models.category import Category


class Menu(models.Model):
    # Categoryへの外部キー（1つのCategoryに複数のMenuが属する）
    # NOTE _idが末尾に自動で付く。変数名に_idをつけてしまうとエラーになるので注意。
    category = models.ForeignKey(
        Category,
        related_name='menus',
        on_delete=models.CASCADE,
    )

    class EngineType(models.TextChoices):
        BLACK_FOREST_LABS = 'black_forest_labs', 'black_forest_labs'
        IDEOGRAM = 'ideogram', 'ideogram'
        IMAGEN3 = 'imagen3', 'imagen3'
        MIDJOURNEY = 'midjourney', 'midjourney'

    name = models.CharField(max_length=255)
    description = models.TextField(default="", blank=True)
    engine = models.CharField(max_length=255, choices=EngineType.choices)
    prompt = models.TextField()
    negative_prompt = models.TextField(blank=True)
    credit = models.IntegerField()
    sample_input_img_url = models.URLField(max_length=200, default="", blank=True)
    sample_result_img_url = models.URLField(max_length=200, default="", blank=True)
    
    # 表示順序（小さい順に表示）
    display_order = models.IntegerField(default=0, help_text="表示順序（小さい順に表示）")
