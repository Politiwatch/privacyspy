# Generated by Django 2.2.3 on 2019-07-29 01:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='rubricselection',
            name='citation',
            field=models.TextField(blank=True, default=''),
        ),
    ]
