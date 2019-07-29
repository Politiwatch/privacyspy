from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('product/<int:product_slug>/', views.product, name='product'),
    # path('login/', views._login, name='login'),
    # path('register/', views.register, name='register'),
    # path('reset/', views.reset, name='reset'),
    # path('logout/', views._logout, name="logout"),
]