from django.urls import path

from . import views

urlpatterns = [
    path('mirror/', views.mirror, name="mirror"),
]