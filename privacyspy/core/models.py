from django.db import models
from django.contrib.auth.models import User

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
    option = models.ForeignKey(RubricOption, on_delete=models.CASCADE)
    policy = models.ForeignKey(PrivacyPolicy, on_delete=models.CASCADE)
    citation = models.TextField()

class Edit(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    description = models.TextField()

class SuggestedAction(models.Model):
    edit = models.ForeignKey(Edit, on_delete=models.CASCADE)
    eval_action = models.TextField()

class Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission_level = models.IntegerField(default=0)