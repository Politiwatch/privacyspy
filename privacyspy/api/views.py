from django.http import JsonResponse
import os
from datetime import timedelta
from django.utils import timezone
from core.models import Product, PrivacyPolicy, RubricQuestion, RubricOption, RubricSelection
from urllib.parse import urlparse
import math
import traceback

def retrieve_products(request):
    hostname = request.GET.get("hostname", "").strip().lower()
    if hostname == "":
        return JsonResponse({
            "error": "No hostname provided."
        })

    elements = hostname.split(".")
    regex = "\.?".join(
        ["(%s\.)?" % element for element in elements[:-2]] + elements[-2:])
    print(regex)
    products = Product.objects.filter(
        hostname__iregex=regex, published=True)[:10]
    policies = []
    for entry in products:
        print("hello\n")
        temp = entry.current_policy
        if temp != None:
            policies.append(temp)

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

        description = policy.product.description

        response.append({
            "url": policy.original_url,
            "added": policy.added,
            "cached_score": policy.cached_score,
            "product_name": policy.product.name,
            "product_description": description if description != "" else None,
            "rubric": rubric,
            "warnings": [warning.to_dict() for warning in policy.product.warnings()]
        })

    response = JsonResponse({"response": response, "status": "success"})
    response["Access-Control-Allow-Origin"] = "*"
    return response

database_cache = None

def retrieve_database(request):
    global database_cache

    if database_cache == None or timezone.now() - database_cache["last_updated"] > timedelta(hours=2):
        print("Refreshing cache...")
        output = []
        products = Product.objects.filter(published=True)
        for product in products:
            policy = product.current_policy
            if policy != None:
                output.append({
                    "name": product.name,
                    "hostname": product.hostname,
                    "slug": product.slug,
                    "score": policy.cached_score if not math.isnan(policy.cached_score if policy.cached_score != None else float('NaN')) else None,
                    "last_updated": policy.updated,
                    "has_warnings_active": product.has_active_warning(),
                    "has_highlights": len(policy.highlighted_snapshot) > 0
                })
        database_cache = {
            "last_updated": timezone.now(),
            "data": output
        }
    response = JsonResponse(database_cache["data"], safe=False)
    response["Access-Control-Allow-Origin"] = "*"
    return response

def retrieve_everything(request):
    try:
        products = []
        for product in Product.objects.all():
            policy = product.current_policy
            if policy is None:
                continue
            products.append({
                "name": product.name,
                "slug": product.slug,
                # "icon": product.icon,
                "hostnames": product.hostname.split(","),
                "description": product.description,
                "published": product.published,
                "contributors": [maintainer.username for maintainer in product.maintainers.all()],
                "warnings": [{
                    "title": warning.title,
                    "description": warning.description,
                    "added": warning.added.isoformat(),
                    "updated": warning.updated.isoformat(),
                    "severity": warning.severity,
                } for warning in product.warnings()],
                "sources": [policy.original_url],
                "rubric": [{
                    "question": {
                        "text": question.text,
                        "description": question.description,
                        "max_value": question.max_value,
                        "category": question.category,
                    },
                    "answer": {
                        "text": question.answer.option.text,
                        "value": question.answer.option.value,
                        "selection_description": question.answer.option.description,
                        "citation": question.answer.citation,
                        "note": question.answer.note,
                        "updated": question.answer.updated.isoformat(),
                    } if question.answer is not None else None,
                } for question in policy.questions_with_selections()]
            })
        return JsonResponse(products, safe=False)
    except:
        traceback.print_exc()
