from django.db import models

class Product(models.Model):
    name = models.TextField()
    slug = models.TextField(unique=True)
    icon = models.BinaryField(editable=True)
    description = models.TextField()

class PrivacyPolicy(models.Model):
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    highlights_json = models.TextField(blank=True)
    out_of_date = models.BooleanField(default=False)
    erroneous = models.BooleanField(default=False)
    original_url = models.TextField()

class RubricQuestion(models.Model):
    name = models.TextField()
    description = models.TextField(blank=True)

class RubricOption(models.Model):
    name = models.TextField()
    question = models.ForeignKey(RubricQuestion, on_delete=models.CASCADE)
    score_effect = models.FloatField()

class RubricSelection(models.Model):
    option = models.ForeignKey(RubricOption)
    policy = models.ForeignKey(PrivacyPolicy)