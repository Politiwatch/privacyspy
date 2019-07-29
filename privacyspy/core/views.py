from django.shortcuts import render, get_object_or_404
from .models import Product, PrivacyPolicy

def index(request):
    return render(request, 'core/index.html', context={
        "title": "Making online privacy (slightly) simpler",
        "products": Product.objects.all()
    })

def product(request, product_slug):
    product = get_object_or_404(Product, slug=product_slug)
    policy = request.GET.get("revision", None)
    if policy == None:
        policy = product.current_policy
    else:
        policy = get_object_or_404(PrivacyPolicy, id=policy, product=product)
    return render(request, 'core/product.html', context={
        "product": product,
        "title": product.name + " Privacy Policy",
        "policy": policy
    })
