from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
import json
import requests
from django.utils.html import escape
from .util import to_hex_code, lighten_color

class Product(models.Model):
    name = models.TextField()
    slug = models.TextField(unique=True)
    icon = models.TextField(blank=True, default="")
    description = models.TextField()

    @property
    def current_policy(self):
        policies = PrivacyPolicy.objects.filter(product=self, published=True).order_by("-added")
        if policies.count() == 0:
            return None
        return policies[0]

    def __str__(self):
        return self.name

class PrivacyPolicy(models.Model):
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    highlights_json = models.TextField(blank=True)
    out_of_date = models.BooleanField(default=False)
    erroneous = models.BooleanField(default=False)
    original_url = models.TextField()
    published = models.BooleanField(default=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    def rubric_selections(self):
        return RubricSelection.objects.filter(policy=self).order_by("-option.value")

    @property
    def score(self):
        selections = self.rubric_selections()
        max_score = sum([selection.option.question.max_value for selection in selections])
        score = sum([selection.option.value for selection in selections])
        if max_score == 0:
            return float('NaN')
        return (score / max_score) * 10

    @property
    def revisions(self):
        return PrivacyPolicy.objects.filter(product=self.product)

    def parse_highlights(self):
        if self.highlights_json.strip() == "":
            return None
        data = json.loads(self.highlights_json)
        for sentence in data:
            sentence["sentence"] = escape(sentence["sentence"]).replace("\n", "<br>")
            sentence["color"] = "#" + to_hex_code(*lighten_color(213, 0, 249, 1.5 - sentence["score"]))
        return data

    def load_highlights_via_url(self):
        data = requests.get("http://highlights-api.privacyspy.org/analyze", params={
            "token": settings.HIGHLIGHTS_API_TOKEN,
            "url": self.original_url
        }).json()
        self.highlights_json = json.dumps(data["response"])

class RubricQuestion(models.Model):
    name = models.TextField()
    description = models.TextField(blank=True, default="")
    max_value = models.FloatField()

class RubricOption(models.Model):
    name = models.TextField()
    question = models.ForeignKey(RubricQuestion, on_delete=models.CASCADE)
    value = models.FloatField()
    description = models.TextField(blank=True, default="")

class RubricSelection(models.Model):
    option = models.ForeignKey(RubricOption, on_delete=models.CASCADE)
    policy = models.ForeignKey(PrivacyPolicy, on_delete=models.CASCADE)
    citation = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    updated = models.DateTimeField(auto_now=True)

class Edit(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    description = models.TextField()

class SuggestedAction(models.Model):
    edit = models.ForeignKey(Edit, on_delete=models.CASCADE)
    eval_action = models.TextField()

class Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission_level = models.IntegerField(default=0)