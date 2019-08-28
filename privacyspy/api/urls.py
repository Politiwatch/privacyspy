from django.urls import path

from . import views

urlpatterns = [
    path('retrieve_products/', views.retrieve_products,
         name="retrieve_products"),
]
