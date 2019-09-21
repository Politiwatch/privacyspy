from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('product/<product_slug>/', views.product, name='product'),
    path('edit-policy/<policy_id>/', views.edit_policy, name='edit_policy'),
    path('login/', views.login_user, name='login'),
    path('account/', views.account, name="account"),
    path('logout/', views.logout_user, name="logout"),
    path("delete-account/", views.delete_account, name="delete_account"),
    path("directory/", views.directory, name="directory"),
    path("suggestions/", views.suggestions, name="suggestions"),
    path("create-suggestion/", views.create_suggestion, name="create_suggestion"),
    path("terms-and-privacy/", views.terms_and_privacy, name="terms_and_privacy"),
    path("about/", views.about, name="about"),
    path("contributions/", views.contributions, name="contributions"),
    path("revisions/policy/<int:pk>/", views.PolicyHistoryCompareView.as_view(), name="policy_revisions"),
    path("revisions/selection/<int:pk>/", views.SelectionHistoryCompareView.as_view(), name="selection_revisions"),
]
