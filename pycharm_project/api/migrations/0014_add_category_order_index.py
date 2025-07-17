# Generated for category order

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0013_chargeoption_alter_phoneuser_credits'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='order_index',
            field=models.IntegerField(default=0),
        ),
    ]
