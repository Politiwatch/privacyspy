from django.contrib import admin
from .models import Product, PrivacyPolicy, Warning, RubricQuestion, RubricOption, RubricSelection, Suggestion, Profile, LoginKey


class WarningInline(admin.StackedInline):
    model = Warning
    show_change_link = True
    can_delete = True
    extra = 0


class PrivacyPolicyInline(admin.StackedInline):
    model = PrivacyPolicy
    show_change_link = True
    extra = 0


class ProductAdmin(admin.ModelAdmin):
    view_on_site = True
    list_display = ('name', 'slug', 'featured')
    list_filter = ('featured',)
    search_fields = ['name', 'hostname', 'description']
    inlines = [WarningInline, PrivacyPolicyInline]


admin.site.register(Product, ProductAdmin)


class PrivacyPolicyAdmin(admin.ModelAdmin):
    view_on_site = True
    list_display = ('id', 'product', 'added', 'updated',
                    'erroneous', 'out_of_date', 'published', 'cached_score')
    list_filter = ('published', 'out_of_date', 'erroneous')
    list_select_related = ('product',)
    search_fields = ['product__name']


admin.site.register(PrivacyPolicy, PrivacyPolicyAdmin)


class RubricOptionInline(admin.StackedInline):
    model = RubricOption
    show_change_link = True
    can_delete = True
    extra = 0


class RubricQuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'published', 'max_value', 'category')
    list_filter = ('published',)
    search_fields = ['text', 'description']
    inlines = [RubricOptionInline]


admin.site.register(RubricQuestion, RubricQuestionAdmin)


class RubricOptionAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'value')
    search_fields = ['text', 'description']


admin.site.register(RubricOption, RubricOptionAdmin)


class RubricSelectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'option', 'policy', 'updated')
    search_fields = ['note', 'citation']


admin.site.register(RubricSelection, RubricSelectionAdmin)


class SuggestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'policy', 'rubric_selection',
                    'status', 'created', 'updated')
    list_select_related = ('policy', 'rubric_selection')
    search_fields = ['text', 'comment']


admin.site.register(Suggestion, SuggestionAdmin)


class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'permission_level')
    list_select_related = ('user',)


admin.site.register(Profile, ProfileAdmin)


class LoginKeyAdmin(admin.ModelAdmin):
    list_display = ('email', 'expires', 'used', 'created', 'ip')
    list_filter = ('used',)


admin.site.register(LoginKey, LoginKeyAdmin)


class WarningAdmin(admin.ModelAdmin):
    view_on_site = True
    list_display = ('title', 'product', 'added',
                    'updated', 'severity', 'severity_word')
    list_select_related = ('product',)
    search_fields = ['title', 'description']


admin.site.register(Warning, WarningAdmin)
