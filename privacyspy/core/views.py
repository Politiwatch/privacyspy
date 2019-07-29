from django.shortcuts import render
from .models import Product

def index(request):
    return render(request, 'core/index.html', context={
        "title": "Making online privacy (slightly) simpler",
        "products": Product.objects.all()
    })

def product(request, product_slug):
    return render(request, 'core/base.html')
