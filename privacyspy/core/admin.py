from django.contrib import admin
from .models import Product, PrivacyPolicy, Warning, RubricQuestion, RubricOption, RubricSelection, Suggestion, Profile, LoginKey

# Register your models here.
admin.site.register(Product)
admin.site.register(PrivacyPolicy)
admin.site.register(RubricQuestion)
admin.site.register(RubricOption)
admin.site.register(RubricSelection)
admin.site.register(Suggestion)
admin.site.register(Profile)
admin.site.register(LoginKey)
admin.site.register(Warning)