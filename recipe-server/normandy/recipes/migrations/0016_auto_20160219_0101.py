# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-02-19 01:01
# flake8: noqa
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0015_auto_20160217_1819'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReleaseChannel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=255, unique=True)),
                ('name', models.CharField(max_length=255)),
            ],
            options={
                'ordering': ['slug'],
            },
        ),
        migrations.AddField(
            model_name='recipe',
            name='release_channels',
            field=models.ManyToManyField(blank=True, to='recipes.ReleaseChannel'),
        ),
    ]
