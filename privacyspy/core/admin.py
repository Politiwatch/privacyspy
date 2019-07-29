from django.contrib import admin
from .models import Product, PrivacyPolicy, RubricQuestion, RubricOption, RubricSelection, Edit, SuggestedAction, Profile

# Register your models here.
admin.site.register(Product)
admin.site.register(PrivacyPolicy)
admin.site.register(RubricQuestion)
admin.site.register(RubricOption)
admin.site.register(RubricSelection)
admin.site.register(Edit)
admin.site.register(SuggestedAction)
admin.site.register(Profile)