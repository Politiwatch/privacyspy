import os
import json
import threading
import requests
import random

from core.models import Product, PrivacyPolicy, RubricQuestion, RubricOption, RubricSelection
from urllib.parse import urlparse


# make sure to change when deploying
BASE_URL = "http://localhost:5000/"

Product.objects.all().delete()
PrivacyPolicy.objects.all().delete()

for root, dirs, files in os.walk("./data/ieql/."):
    for file in files:
        with open("./data/ieql/" + file, "r", encoding="utf-8") as f:
            ieql_output = json.load(f)

        for entry in ieql_output:
            url = entry["data"]["items"][0]["Url"]
            # skip if URL is already in the database
            if len(PrivacyPolicy.objects.filter(original_url=url)) > 0:
                continue
            html = entry["data"]["items"][2]["FullContent"]

            print("Loading highlights for " + url)
            data = requests.post(BASE_URL + "analyze", data={
                "token": "token",
                "raw_html": html,
            }).json()

            if data["status"] == "success":
                hostname = urlparse(url).hostname.lower()
                slug = hostname if len(Product.objects.filter(
                    slug=hostname)) == 0 else hostname + '-' + salt(length=6)
                highlights_json = data["response"]

                product = Product(
                    name=hostname,
                    slug=slug,
                    hostname=hostname
                )
                product.save()
                policy = PrivacyPolicy(
                    highlights_json=json.dumps(data["response"]),
                    original_url=url,
                    product=product,
                    published=True
                )
                policy.save()
            elif data["status"] == "error":
                if data["errorCode"] == 5:
                    print("Privacy policy is likely not in English.")
                else:
                    print("There was some error when extracting this privacy policy.")


def salt(length=16):
    ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

    return ''.join(random.choice(ALPHABET) for i in range(length))
