from django.urls import path

from . import views

urlpatterns = [
    # path('retrieve_products/', views.retrieve_products, name="retrieve_products"),
    path('retrieve_database/', views.retrieve_database, name="retrieve_database"),
    path('retrieve_everything/', views.retrieve_everything, name="retrieve_everything"),
]
