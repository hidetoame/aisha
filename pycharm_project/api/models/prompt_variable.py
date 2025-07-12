from django.db import models

from api.models.menu import Menu


class PromptVariable(models.Model):
    # Menuへの外部キー（1つのMenuに複数のPromptVariableが属する）
    menu = models.ForeignKey(Menu, related_name='prompt_variables', on_delete=models.CASCADE)

    label = models.CharField(max_length=255)
    key = models.CharField(max_length=255)
