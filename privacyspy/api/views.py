from django.http import JsonResponse
import os

from core.models import Product, PrivacyPolicy, RubricQuestion, RubricOption, RubricSelection
from urllib.parse import urlparse


def retrieve_by_url(request):
    url = request.GET.get("url", "")
    if url == "":
        return JsonResponse({
            "error": "No URL provided."
        })

    hostname = urlparse(url).hostname.lower()

    token = request.GET.get("token", "")
    if token == "":
        return JsonResponse({
            "error": "No token provided."
        })
    elif token != os.environ.get("api_token"):
        return JsonResponse({
            "error": "Invalid token."
        })

    try:
        products = Product.objects.filter(
            hostname__contains=hostname)
        policies = []
        for entry in products:
            try:
                policies.append(PrivacyPolicy.objects.filter(
                    product=entry, published=True, out_of_date=False, erroneous=False).order_by('-added')[0])
            except:
                pass
    except:
        return JsonResponse({
            "error": "Couldn't find any policy at given URL."
        })

    response = []
    for policy in policies:
        selections = policy.rubric_selections()

        rubric = []
        for selection in selections:
            options = RubricOption.objects.filter(
                question=selection.option.question)
            temp = []
            for option in options:
                temp.append({
                    "text": option.text,
                    "description": option.description,
                    "value": option.value
                })

            rubric_obj = {
                "question": {
                    "text": selection.option.question.text,
                    "description": selection.option.question.description,
                    "max_value": selection.option.question.max_value
                },
                "selection": {
                    "text": selection.option.text,
                    "description": selection.option.description,
                    "value": selection.option.value
                },
                "options": temp
            }

            rubric.append(rubric_obj)

        response.append({
            "url": policy.original_url,
            "highlights": policy.highlights_json,
            "added": policy.added,
            "cached_score": policy.cached_score,
            "product_name": policy.product.name,
            "product_description": policy.product.description,
            "rubric": rubric
        })

    return JsonResponse({"response": response, "status": "success"})
