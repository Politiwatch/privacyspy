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
    path("directory/", views.directory, name="directory")
]