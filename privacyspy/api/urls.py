from django.urls import path

from . import views

urlpatterns = [
    path('retrieve_by_url/', views.retrieve_by_url, name="retrieve_by_url"),
]
