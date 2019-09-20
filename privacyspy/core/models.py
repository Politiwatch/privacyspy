from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
import json
import requests
from django.utils.html import escape
from .util import to_hex_code, lighten_color, ratio_color, separate_rubric_questions_by_category
import threading
from django.utils.crypto import get_random_string
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.contrib.postgres.search import SearchVector
from django.conf import settings
from .email import send_email
from urllib.parse import urlparse
from django.db.models import Q


class Product(models.Model):
    def __extract_hostname_from_policy__(self):
        if self.current_policy == None:
            return None
        return urlparse(self.current_policy.original_url).hostname.lower()

    name = models.TextField(db_index=True)
    slug = models.TextField(unique=True)
    icon = models.TextField(blank=True, default="",
                            help_text="Use https://www.base64-image.de/")
    hostname = models.TextField(default="UNSET", db_index=True)
    description = models.TextField(default="", db_index=True)
    featured = models.BooleanField(default=False)
    published = models.BooleanField(default=True)
    maintainers = models.ManyToManyField(User)
    last_email_blast = models.DateTimeField(auto_now=True)


    def create_blank_policy(self, url):
        PrivacyPolicy.objects.create(original_url=url, product=self, published=True)

    def is_maintainer(self, user):
        return self.maintainers.filter(id=user.id).exists()

    @staticmethod
    def is_maintaining(user):
        return user.product_set.all()

    def get_absolute_url(self):
        return "/product/%s" % (self.slug)

    @staticmethod
    def search(query):
        if not settings.DEBUG:
            return Product.objects.annotate(
                search=SearchVector('name', 'hostname')
            ).filter(search=query, published=True)
        return Product.objects.filter(name__contains=query, published=True)

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

    def watchers(self):
        profiles = self.profile_set.all()
        return [p.user for p in profiles]

    def warnings(self):
        return Warning.objects.filter(product=self).order_by("-added")

    def has_active_warning(self):
        warnings = self.warnings().filter(severity__gt=2)
        if len(warnings) == 0:
            return False
        most_recent = warnings[0]
        timediff = timezone.now() - most_recent.added
        if timediff < timedelta(weeks=24):
            return True
        return False


class Warning(models.Model):
    title = models.TextField()
    description = models.TextField()
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    severity = models.IntegerField(
        help_text="Possible values: 1 (low), 2 (medium), 3 (high)")  # 1=low, 2=med, 3=high
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    def severity_word(self):  # turns the #-based severity into a word
        if self.severity < 2:
            return "Low"
        if self.severity == 2:
            return "Medium"
        if self.severity > 2:
            return "High"

    def __str__(self):
        return self.title + " (%s)" % self.product.name

    def to_dict(self):
        return {
            "title": self.title,
            "description": self.description,
            "added": self.added,
            "updatd": self.updated,
            "severity": self.severity
        }

    def get_absolute_url(self):
        return "/product/%s/#warnings" % (self.product.slug)


class PrivacyPolicy(models.Model):
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    highlights_json = models.TextField(blank=True)
    highlighted_snapshot = models.TextField(blank=True)
    out_of_date = models.BooleanField(default=False)
    erroneous = models.BooleanField(default=False)
    original_url = models.TextField()
    published = models.BooleanField(default=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    cached_score = models.FloatField(null=True, blank=True, default=None)

    def get_absolute_url(self):
        return "/product/%s/?revision=%s" % (self.product.slug, str(self.id))

    def rubric_selections(self):
        return RubricSelection.objects.filter(policy=self).order_by("option__question__category")

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

    def categorized_rubric_selections(self):
        return separate_rubric_questions_by_category(self.rubric_selections())

    def suggestions(self, only_open=True):
        if only_open:
            return Suggestion.objects.filter(policy=self, status="O")
        else:
            return Suggestion.objects.filter(policy=self)

    def color(self):
        return ratio_color(self.score / 10)

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
        self.cached_score = self.calculate_score(update_cache=False)
        self.save()

    @property
    def revisions(self):
        return PrivacyPolicy.objects.filter(product=self.product, published=True)

    # def parse_highlights(self):
    #     if self.highlights_json.strip() == "":
    #         return None
    #     data = json.loads(self.highlights_json)
    #     for sentence in data:
    #         sentence["sentence"] = escape(
    #             sentence["sentence"]).replace("\n", "<br>")
    #         factor = 10
    #         sentence["color"] = "#" + \
    #             to_hex_code(*lighten_color(213 + factor, 0, 249 + factor,
    #                                        1.25 - sentence["score"]))
    #     return data

    def load_highlights_via_url(self, url):
        def do_task():
            print("Loading highlights from %s..." % url)
            data = requests.get(settings.HIGHLIGHTS_API_URL + "/analyze", params={
                "token": settings.HIGHLIGHTS_API_TOKEN,
                "url": url
            }).json()
            if data["status"] == "success":
                self.highlighted_snapshot = data["response"]
                self.save()
        t = threading.Thread(target=do_task)
        t.start()

    def load_highlights_via_plaintext(self, plaintext):
        def do_task():
            print("Loading highlights from plaintext...")
            data = requests.post(settings.HIGHLIGHTS_API_URL + "/analyze", data={
                "token": settings.HIGHLIGHTS_API_TOKEN,
                "plain_text": plaintext,
            }).json()
            if data["status"] == "success":
                self.highlighted_snapshot = data["response"]
                self.save()
        t = threading.Thread(target=do_task)
        t.start()


class RubricQuestion(models.Model):
    text = models.TextField()
    description = models.TextField(blank=True, default="")
    published = models.BooleanField(default=False)
    max_value = models.FloatField()
    category = models.TextField(default="Unknown")

    def __str__(self):
        return self.text

    @property
    def options(self):
        return RubricOption.objects.filter(question=self).order_by("value")

    @property
    def weight(self):
        if not hasattr(self, "_cached_weight"):
            self._cached_weight = self.max_value / sum([question.max_value for question in RubricQuestion.objects.filter(published=True)]) * 100
        return self._cached_weight


class RubricOption(models.Model):
    text = models.TextField()
    question = models.ForeignKey(RubricQuestion, on_delete=models.CASCADE)
    value = models.FloatField()
    description = models.TextField(blank=True, default="")

    def color(self):
        return ratio_color(float(self.value) / float(self.question.max_value))

    def __str__(self):
        return self.text


class RubricSelection(models.Model):
    option = models.ForeignKey(RubricOption, on_delete=models.CASCADE)
    policy = models.ForeignKey(PrivacyPolicy, on_delete=models.CASCADE)
    citation = models.TextField(blank=True, default="")
    note = models.TextField(blank=True, default="")
    updated = models.DateTimeField(auto_now=True)

    @property
    def category(self):
        return self.option.question.category

    @property
    def max_value(self):
        return self.option.question.max_value

    def has_note_or_citation(self):
        return len(self.note.strip()) + len(self.citation.strip()) > 0


class Suggestion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    policy = models.ForeignKey(
        PrivacyPolicy, on_delete=models.CASCADE, null=True, blank=True)
    rubric_selection = models.ForeignKey(
        RubricSelection, on_delete=models.CASCADE, null=True, blank=True)
    text = models.TextField()
    # 'O' -> open, 'D' -> declined, 'R' -> resolved (& implemented)
    status = models.CharField(max_length=1, default="O")
    comment = models.TextField(blank=True, default="")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Suggestion from " + self.user.username

    def is_open(self):
        return self.status == "O"

    def can_edit(self, user):
        if user == self.user:
            return True
        return self.can_super_edit(user)

    def super_editors(self): # people who need to respond, essentially
        users = []
        if self.policy == None:
            users.extend(User.objects.filter(is_superuser=True))
        else:
            maintainers = self.policy.product.maintainers.all()
            if maintainers.count() == 0:
               users.extend(User.objects.filter(is_superuser=True))
            else:
                users.extend(maintainers)
        return users

    def can_super_edit(self, user):
        if user.is_superuser:
            return True
        if self.policy != None:
            if self.policy.product.is_maintainer(user):
                return True
        return False

    @staticmethod
    def user_open_suggestions(user):
        return Suggestion.objects.filter(user=user, status="O").order_by("-updated")

    @staticmethod
    def user_closed_suggestions(user):
        return Suggestion.objects.filter(user=user).exclude(status="O").order_by("-updated")

    @staticmethod
    def all_open_suggestions():
        return Suggestion.objects.filter(status="O")


class Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission_level = models.IntegerField(default=0)
    watching_products = models.ManyToManyField(Product)

    @staticmethod
    def for_user(user):
        return Profile.objects.get(user=user)

    def __str__(self):
        return self.user.email


class LoginKey(models.Model):
    email = models.TextField()
    token = models.TextField()
    expires = models.DateTimeField()
    ip = models.GenericIPAddressField(null=True, blank=True)
    redirect = models.TextField(blank=True, default="")
    used = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)

    @staticmethod
    # note: all email addresses are treated as lowercase
    def go_for_email(email, ip, redirect=None):
        if redirect == None:
            redirect = ""
        key = LoginKey.objects.create(email=email.lower(), token=get_random_string(
            length=32), expires=timezone.now() + timedelta(hours=1), ip=ip, redirect=redirect)
        send_email("Your PrivacySpy Login", "login", email.lower(), {
            "link": "/login/?token=" + key.token
        })

    def is_valid(self):
        return (not self.used) and timezone.now() < self.expires

    @staticmethod
    def log_in_via_token(request):
        token = request.GET.get("token", None)
        if token == None:
            return (False, None)
        keys = LoginKey.objects.filter(
            token=token, expires__gt=timezone.now(), used=False)
        if keys.count() > 0:
            key = keys[0]
            key.used = True
            key.save()
            users = User.objects.filter(email=key.email)
            if users.count() == 0:
                user = User.objects.create_user(
                    username="newuser_" + get_random_string(length=5), email=key.email)
                profile = Profile.objects.create(user=user)
                login(request, user)
                return (True, key.redirect)
            else:
                login(request, users[0])
                return (True, key.redirect)
        return (False, None)

    @staticmethod
    def is_ip_overused(ip):
        keys = LoginKey.objects.filter(
            ip=ip, created__gt=timezone.now() - timedelta(hours=1)).count()
        return keys > 5
