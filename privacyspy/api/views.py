from django.http import JsonResponse

from core.models import Product, PrivacyPolicy # etc

def mirror(request):
    return JsonResponse({
        "value": request.GET.get("value", "no value") # parameter, default
    })