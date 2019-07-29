from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('product/<product_slug>/', views.product, name='product'),
    path('edit-policy/<policy_id>/', views.edit_policy, name='edit_policy'),
    # path('login/', views._login, name='login'),
    # path('register/', views.register, name='register'),
    # path('reset/', views.reset, name='reset'),
    # path('logout/', views._logout, name="logout"),
]