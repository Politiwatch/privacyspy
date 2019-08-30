from django.shortcuts import render, get_object_or_404, redirect
from .models import Product, PrivacyPolicy, RubricQuestion, RubricSelection, Suggestion, RubricOption, LoginKey, Profile
from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import logout
from django.db.models import Q
from django.conf import settings
from django.http import HttpResponseForbidden
import re
from slugify import slugify
import random
from .util import username_exists, get_client_ip


def _render(request, template, context=None):
    if context == None:
        context = {}
    credit = ["<a href='https://rmrm.io'>Miles McCain</a>",
              "<a href='https://igor.fyi'>Igor Barakaiev</a>"]
    random.shuffle(credit)
    context["credit"] = credit
    context["user"] = request.user
    context["request"] = request
    return render(request, template, context=context)


def index(request):
    return _render(request, 'core/index.html', context={
        "title": "Making online privacy (slightly) simpler",
        "n": range(60),
        "keywords": ["privacy", "is", "a",
                     "fundamental", "right"],
        "total_policies": PrivacyPolicy.objects.all().count(),
        "featured_products": Product.objects.filter(featured=True)[:6],
    })


def terms_and_privacy(request):
    return _render(request, 'core/terms_and_privacy.html', context={
        "title": "Terms & Privacy"
    })


def about(request):
    rubric_categories = []
    rubric_categories = set(
        [question.category for question in RubricQuestion.objects.all()])
    rubric_questions = {}
    for category in rubric_categories:
        rubric_questions[category] = []
        for question in RubricQuestion.objects.filter(category__iexact=category, published=True).order_by("-max_value"):
            rubric_questions[category].append(question)
    return _render(request, 'core/about.html', context={
        "title": "About",
        "rubric_questions": rubric_questions,
    })


def product(request, product_slug):
    product = get_object_or_404(Product, slug=product_slug)
    if request.method == "POST" and request.user.is_authenticated:
        action = request.POST.get("action", None)
        profile = Profile.for_user(request.user)
        if action == "watch":
            profile.watching_products.add(product)
        elif action == "unwatch":
            profile.watching_products.remove(product)
        profile.save()
    policy = request.GET.get("revision", None)
    if policy == None:
        policy = product.current_policy
    else:
        policy = get_object_or_404(PrivacyPolicy, id=policy, product=product)
    watching = False
    if request.user.is_authenticated:
        if product in Profile.for_user(request.user).watching_products.all():
            watching = True
    if request.GET.get("next", None) != None:
        return redirect(request.GET.get("next", None))
    is_maintainer = request.user.is_authenticated and product.is_maintainer(
        request.user)
    return _render(request, 'core/product.html', context={
        "product": product,
        "title": product.name + " Privacy Policy",
        "policy": policy,
        "watching": watching,
        "is_maintainer": is_maintainer
    })


@login_required
def contributions(request):
    error = None
    message = None
    prefilled = {}
    if request.method == "POST":
        name = request.POST.get("name", None)
        description = request.POST.get("description", None)
        hostname = request.POST.get("hostname", None)
        policy_url = request.POST.get("policy-url", None)

        prefilled["name"] = name if name != None else ""
        prefilled["description"] = description if description != None else ""
        prefilled["hostname"] = hostname if hostname != None else ""
        prefilled["policy_url"] = policy_url if policy_url != None else ""

        if None in [name, description, hostname, policy_url]:
            error = "Please fill out all the required fields!"
        else:
            slug = slugify(name)
            if Product.objects.filter(slug=slug).exists():
                error = "A product with that name already exists; please add a different product."
            else:
                product = Product.objects.create(name=name, description=description, hostname=hostname, slug=slug, published=False)
                product.create_blank_policy(policy_url)
                product.maintainers.add(request.user)
                Profile.for_user(request.user).watching_products.add(product)
                return redirect(product)
    return _render(request, 'core/contributions.html', context={
        "title": "Contributions",
        "maintaining": Product.is_maintaining(request.user),
        "prefilled": prefilled,
        "error": error,
        "message": message
    })


@login_required
def edit_policy(request, policy_id):
    policy = get_object_or_404(PrivacyPolicy, id=policy_id)

    if not (request.user.is_superuser or policy.product.is_maintainer(request.user)):
        raise HttpResponseForbidden()

    actions = []
    errors = []
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
            if request.user.is_superuser:  # only allowed for superusers
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
                if option_str == "None":
                    continue
                if option_str != "unset":
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
                    print('.....' + citation)
                    if not question.answer.has_note_or_citation():
                        print("appending note")
                        errors.append(
                            "The question <strong>%s</strong> is missing a citation or a note. All questions must have either a citation or a note." % question.text)
                else:
                    if question.answer != None:
                        question.answer.delete()
            policy.calculate_score()
            actions.append("Successfully updated ratings.")

    return _render(request, 'core/edit_policy.html', context={
        "policy": policy,
        "title": "Editing Privacy Policy",
        "actions": actions,
        "rubric_questions": policy.questions_with_selections(),
        "errors": errors,
    })


def login_user(request):
    error = None
    message = None
    if request.user.is_authenticated:
        if request.GET.get("next", None) != None:
            return redirect(request.GET.get("next"))
        return redirect('index')
    (token_logged_in, redirect_to) = LoginKey.log_in_via_token(request)
    if token_logged_in:
        if redirect_to != "":
            return redirect(redirect_to)
        return redirect('index')
    if request.method == "POST":
        if LoginKey.is_ip_overused(get_client_ip(request)):
            error = "To prevent abuse, you may only request an email login link five times per hour. We're sorry for the inconvenience. Please check back later."
        else:
            email = request.POST.get("email", "")
            redirect_to = request.GET.get("next", None)
            if re.fullmatch(r"[^@]+@[^@]+\.[^@]+", email):
                LoginKey.go_for_email(email, get_client_ip(
                    request), redirect=redirect_to)
                message = "A login link has been sent to the email address you provided. Check your inbox."
            else:
                error = "Please enter a valid email address!"
    return _render(request, 'core/login.html', context={
        "error": error,
        "message": message,
        "title": "Log In or Sign Up",
    })


def account(request):
    error = None
    message = None
    if request.method == "POST":
        new_username = request.POST.get("username", None)
        if new_username != None and new_username != request.user.username:
            if len(new_username) > 24:
                error = "Your username must be shorter than 24 characters."
            elif not new_username.isalnum():
                error = "Your username must be alphanumeric."
            else:
                if username_exists(new_username):
                    error = "That username already exists. Please choose a different one."
                else:
                    request.user.username = new_username
                    request.user.save()
                    message = "Your account information was successfully updated."
    return _render(request, 'core/manage_account.html', context={
        "request": request,
        "title": "My Account",
        "error": error,
        "message": message,
        "profile": Profile.for_user(request.user)
    })


def logout_user(request):
    logout(request)
    return redirect('index')


@login_required(login_url="/login")
def delete_account(request):
    if request.method == "POST":
        request.user.delete()
        return redirect('index')
    return _render(request, 'core/delete_account.html', context={
        "title": "Delete Account",
    })


def directory(request):
    search = request.GET.get("search", None)
    products = None
    if search == None:
        products = Product.objects.filter(featured=True)
    else:
        products = Product.search(search)
    overflow = products.count() > 50 and search != None

    return _render(request, 'core/directory.html', context={
        "title": "Product Directory",
        "products": products[:50],
        "search": search,
        "overflow": overflow,
        "num_policies": PrivacyPolicy.objects.filter(published=True).count()
    })


@login_required(login_url="/login")
def suggestions(request):
    if request.method == "POST":
        suggestion_id = request.POST.get("id", None)
        if suggestion_id != None:
            suggestion = get_object_or_404(Suggestion, id=suggestion_id)
            if suggestion.can_edit(request.user) and (suggestion.is_open() or suggestion.can_super_edit(request.user)):
                text = request.POST.get("text", None)
                comment = request.POST.get("comment", None)
                status = request.POST.get("status", None)
                if text != None and len(text.strip()) != 0 and request.user == suggestion.user:
                    suggestion.text = text
                if comment != None and suggestion.can_super_edit(request.user):
                    suggestion.comment = comment
                if status != None and suggestion.can_super_edit(request.user) and status in ['O', 'D', 'R']:
                    suggestion.status = status
                suggestion.save()

    return _render(request, "core/suggestions.html", context={
        "open_suggestions": Suggestion.user_open_suggestions(request.user),
        "closed_suggestions": Suggestion.user_closed_suggestions(request.user),
        "title": "Suggestions",
        "submitted": request.GET.get("submitted", "False") == "True",
        "all_suggestions": Suggestion.all_open_suggestions() if request.user.is_superuser else []
    })


@login_required(login_url="/login")
def create_suggestion(request):
    error = None
    if request.method == "POST":
        print(request.POST)
        text = request.POST.get("text", None)
        policy_id = request.POST.get("policy", None)
        rubric_selection_id = request.POST.get("rubric-selection", None)
        if len(text.strip()) != 0:
            policy = get_object_or_404(PrivacyPolicy, id=int(
                policy_id)) if policy_id != None else None
            rubric_selection = get_object_or_404(RubricSelection, id=int(
                rubric_selection_id)) if rubric_selection_id != None else None
            Suggestion.objects.create(
                user=request.user, policy=policy, rubric_selection=rubric_selection, text=text)
            return redirect("/suggestions/?submitted=True")
        else:
            error = "You submitted an empty message!"
    policy_id = request.GET.get("policy", None)
    rubric_selection_id = request.GET.get("selection", None)
    policy = None
    rubric_selection = None
    if policy_id != None:
        policy = get_object_or_404(PrivacyPolicy, id=int(policy_id))
    if rubric_selection_id != None:
        rubric_selection = get_object_or_404(
            RubricSelection, id=int(rubric_selection_id))
    return _render(request, "core/create_suggestion.html", context={
        "error": error,
        "policy": policy,
        "rubric_selection": rubric_selection,
        "text": request.GET.get("text", None),
        "title": "Submit a Suggestion"
    })
