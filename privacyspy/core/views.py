from django.shortcuts import render, get_object_or_404
from .models import Product, PrivacyPolicy, RubricQuestion, RubricSelection, RubricOption
from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test


def index(request):
    return render(request, 'core/index.html', context={
        "title": "Making online privacy (slightly) simpler",
        "n": range(60),
        "keywords": ["privacy", "is", "a",
                     "fundamental", "right"]
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


@user_passes_test(lambda u: u.is_superuser)
def edit_policy(request, policy_id):
    policy = get_object_or_404(PrivacyPolicy, id=policy_id)

    actions = []
    if request.method == "POST":
        print(request.POST)
        section = request.POST.get("section", None)
        if section == "metadata":
            policy.out_of_date = request.POST.get(
                "out-of-date", policy.out_of_date) == "True"
            policy.erroneous = request.POST.get(
                "erroneous", policy.erroneous) == "True"
            policy.original_url = request.POST.get(
                "original-url", policy.original_url)
            policy.published = request.POST.get(
                "published", policy.published) == "True"
            policy.save()
            actions.append("Successfully updated metadata.")
        if section == "highlight-by-url":
            url = request.POST.get("source-url", None)
            if url != None:
                policy.load_highlights_via_url(url)
                actions.append(
                    "Loading highlights via the given URL in a background thread.")
        if section == "highlight-by-plaintext":
            text = request.POST.get("source-text", None)
            if text != None:
                policy.load_highlights_via_plaintext(text)
                actions.append(
                    "Loading highlights via plaintext in a background thread.")
        if section == "ratings":
            for question in policy.questions_with_selections():
                option_str = request.POST.get(
                    str(question.id) + '-selection', "None")
                if option_str != "None":
                    option = get_object_or_404(
                        RubricOption, id=int(option_str))
                    citation = request.POST.get(
                        str(question.id) + "-citation", "")
                    note = request.POST.get(str(question.id) + "-note", "")
                    if question.answer == None:
                        RubricSelection.objects.create(
                            option=option, policy=policy, citation=citation)
                    else:
                        if not (question.answer.option == option and question.answer.citation == citation and question.answer.note == note):
                            question.answer.option = option
                            question.answer.citation = citation
                            question.answer.note = note
                            question.answer.save()
                else:
                    if question.answer != None:
                        question.answer.delete()
            actions.append("Successfully updated ratings.")

    return render(request, 'core/edit_policy.html', context={
        "policy": policy,
        "title": "Editing Privacy Policy",
        "actions": actions,
        "rubric_questions": policy.questions_with_selections()
    })
