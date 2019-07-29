from django.shortcuts import render

def index(request):
    return render(request, 'core/base.html', context={
        "title": "Making online privacy (slightly) simpler"
    })

def product(request, product_id):
    return render(request, 'core/base.html')
