from django.shortcuts import render, get_object_or_404
from .models import Product

def index(request):
    return render(request, 'core/index.html', context={
        "title": "Making online privacy (slightly) simpler",
        "products": Product.objects.all()
    })

def product(request, product_slug):
    product = get_object_or_404(Product, slug=product_slug)
    return render(request, 'core/product.html', context={
        "product": product
    })
