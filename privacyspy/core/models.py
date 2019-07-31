from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
import json
import requests
from django.utils.html import escape
from .util import to_hex_code, lighten_color
import threading
from django.utils.crypto import get_random_string
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.auth import login
from .email import send_email


class Product(models.Model):
    name = models.TextField()
    slug = models.TextField(unique=True)
    icon = models.TextField(blank=True, default="")
    description = models.TextField()

    @property
    def current_policy(self):
        policies = PrivacyPolicy.objects.filter(
            product=self, published=True).order_by("-added")
        if policies.count() == 0:
            return None
        return policies[0]

    @property
    def revisions(self):
        most_recent = self.current_policy
        return [policy for policy in PrivacyPolicy.objects.filter(product=self, published=True).order_by("-added") if policy != most_recent]

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
    cached_score = models.FloatField(null=True, default=None)

    def rubric_selections(self):
        return RubricSelection.objects.filter(policy=self).order_by("-option__value")

    def questions_with_selections(self):
        selections = []
        for question in RubricQuestion.objects.all():
            answers = RubricSelection.objects.filter(
                policy=self, option__question=question)
            if answers.count() > 0:
                question.answer = answers[0]
            else:
                question.answer = None
            selections.append(question)
        return selections

    def suggestions(self, only_open=True):
        if only_open:
            return Suggestion.objects.filter(policy=self, status="O")
        else:
            return Suggestion.objects.filter(policy=self)

    @property
    def score(self):
        if self.cached_score != None:
            return self.cached_score
        else:
            return self.calculate_score()

    def calculate_score(self, update_cache=True):
        selections = self.rubric_selections()
        max_score = sum(
            [selection.option.question.max_value for selection in selections])
        score = sum([selection.option.value for selection in selections])
        if max_score == 0:
            return float('NaN')
        final_score = (score / max_score) * 10
        if update_cache:
            if self.cached_score != final_score:
                self.cached_score = final_score
                self.save()
        return final_score

    def update_cached_score(self):
        self.cached_score = self.calculate_score()
        self.save()

    @property
    def revisions(self):
        return PrivacyPolicy.objects.filter(product=self.product, published=True)

    def parse_highlights(self):
        if self.highlights_json.strip() == "":
            return None
        data = json.loads(self.highlights_json)
        for sentence in data:
            sentence["sentence"] = escape(
                sentence["sentence"]).replace("\n", "<br>")
            sentence["color"] = "#" + \
                to_hex_code(*lighten_color(213, 0, 249,
                                           1.25 - sentence["score"]))
        return data

    def load_highlights_via_url(self, url):
        def do_task():
            print("Loading highlights from %s..." % url)
            data = requests.get("http://highlights-api.privacyspy.org/analyze", params={
                "token": settings.HIGHLIGHTS_API_TOKEN,
                "url": url
            }).json()
            self.highlights_json = json.dumps(data["response"])
            self.save()
        t = threading.Thread(target=do_task)
        t.start()

    def load_highlights_via_plaintext(self, plaintext):
        def do_task():
            print("Loading highlights from plaintext...")
            data = requests.post("http://highlights-api.privacyspy.org/analyze", data={
                "token": settings.HIGHLIGHTS_API_TOKEN,
                "plain_text": plaintext,
            }).json()
            self.highlights_json = json.dumps(data["response"])
            self.save()
        t = threading.Thread(target=do_task)
        t.start()


class RubricQuestion(models.Model):
    text = models.TextField()
    description = models.TextField(blank=True, default="")
    published = models.BooleanField(default=False)
    max_value = models.FloatField()

    def __str__(self):
        return self.text

    @property
    def options(self):
        return RubricOption.objects.filter(question=self)


class RubricOption(models.Model):
    text = models.TextField()
    question = models.ForeignKey(RubricQuestion, on_delete=models.CASCADE)
    value = models.FloatField()
    description = models.TextField(blank=True, default="")


class RubricSelection(models.Model):
    option = models.ForeignKey(RubricOption, on_delete=models.CASCADE)
    policy = models.ForeignKey(PrivacyPolicy, on_delete=models.CASCADE)
    citation = models.TextField(blank=True, default="")
    note = models.TextField(blank=True, default="")
    updated = models.DateTimeField(auto_now=True)


class Suggestion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    history = models.TextField(blank=True)
    policy = models.ForeignKey(PrivacyPolicy, on_delete=models.CASCADE)
    rubric_selection = models.ForeignKey(RubricSelection, on_delete=models.CASCADE, null=True, blank=True)
    text = models.TextField()
    status = models.CharField(max_length=1, default="O") # 'O' -> open, 'D' -> declined, 'R' -> resolved (& implemented) 
    comment = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)


class Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission_level = models.IntegerField(default=0)


class LoginKey(models.Model):
    email = models.TextField()
    token = models.TextField()
    expires = models.DateTimeField()
    used = models.BooleanField(default=False)

    @staticmethod
    def go_for_email(email): # note: all email addresses are treated as lowercase
        key = LoginKey.objects.create(email=email.lower(), token=get_random_string(
            length=32), expires=timezone.now() + timedelta(hours=1))
        send_email("Your PrivacySpy Login", "login", email.lower(), {
            "link": "https://privacyspy.org/login/?token=" + key.token
        })

    @staticmethod
    def log_in_via_token(request):
        token = request.GET.get("token", None)
        if token == None:
            return False
        keys = LoginKey.objects.filter(token=token, expires__gt=timezone.now(), used=False)
        if keys.count() > 0:
            key = keys[0]
            key.used = True
            key.save()
            users = User.objects.filter(email=key.email)
            if users.count() == 0:
                user = User.objects.create_user(username="newuser" + get_random_string(length=5), email=key.email)
                profile = Profile.objects.create(user=user)
                login(request, user)
                return True
            else:
                login(request, users[0])
                return True
        return False