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
from .util import username_exists, get_client_ip, separate_rubric_questions_by_category
from .email import send_email, send_many_emails
from meta.views import Meta


def _render(request, template, context=None, title=None, description=None):
    if context == None:
        context = {}

    title = title + " | PrivacySpy" if title != None else "PrivacySpy | Tracking and rating privacy policies."
    context["meta"] = Meta(
        url=request.build_absolute_uri(),
        title=title,
        description="PrivacySpy rates, highlights, and monitors privacy policies. Take back control of your data by understanding how it's being used.",
        use_og=True,
        use_twitter=True,
        use_facebook=True,
        site_name="PrivacySpy",
        image="https://privacyspy.org/static/core/img/graphic.png",
        locale=""
    )
    context["title"] = title

    credit = ["<a href='https://rmrm.io'>Miles McCain</a>",
              "<a href='https://igor.fyi'>Igor Barakaiev</a>"]
    random.shuffle(credit)
    context["credit"] = credit
    context["user"] = request.user
    context["request"] = request
    return render(request, template, context=context)


def index(request):
    return _render(request, 'core/index.html', context={
        "n": range(60),
        "keywords": ["privacy", "is", "a",
                     "fundamental", "right"],
        "total_policies": PrivacyPolicy.objects.all().count(),
        "featured_products": Product.objects.filter(featured=True)[:6],
    }, title="Making online privacy (slightly) simpler")


def terms_and_privacy(request):
    return _render(request, 'core/terms_and_privacy.html', title="Terms & Privacy")


def about(request):
    rubric_questions = separate_rubric_questions_by_category(
        RubricQuestion.objects.all())
    return _render(request, 'core/about.html', context={
        "rubric_questions": rubric_questions,
    }, title="About")


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
        "policy": policy,
        "watching": watching,
        "is_maintainer": is_maintainer
    }, title=product.name + " Privacy Policy")


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

        if min([len(i.strip()) for i in [name, description, hostname, policy_url]]) == 0:
            error = "Please fill out all the required fields!"
        else:
            slug = slugify(name)
            if Product.objects.filter(slug=slug).exists():
                error = "A product with that name already exists; please add a different product."
            else:
                product = Product.objects.create(
                    name=name, description=description, hostname=hostname, slug=slug, published=False)
                product.create_blank_policy(policy_url)
                product.maintainers.add(request.user)
                Profile.for_user(request.user).watching_products.add(product)
                return redirect(product)
    return _render(request, 'core/contributions.html', context={
        "maintaining": Product.is_maintaining(request.user),
        "prefilled": prefilled,
        "error": error,
        "message": message
    }, title="Contributions")


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
        if section == "highlight-by-url" and request.user.is_superuser:
            url = request.POST.get("source-url", None)
            if url != None:
                policy.load_highlights_via_url(url)
                actions.append(
                    "Loading highlights via the given URL in a background thread.")
        if section == "highlight-by-plaintext" and request.user.is_superuser:
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
                            option=option, policy=policy, citation=citation, note=note)
                    else:
                        if not (question.answer.option == option and question.answer.citation == citation and question.answer.note == note):
                            question.answer.option = option
                            question.answer.citation = citation
                            question.answer.note = note
                            question.answer.save()
                    print('.....' + citation)
                    if len(citation.strip()) + len(note.strip()) == 0:
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
        "actions": actions,
        "rubric_questions": policy.questions_with_selections(),
        "errors": errors,
        "is_maintainer": True,  # for editing suggestions on the page
    }, title="Editing: %s (%s)" % (policy.product.name, policy.id))


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
        "next": request.GET.get("next", None)
    }, title="Log In or Sign Up")


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
        "error": error,
        "message": message,
        "profile": Profile.for_user(request.user)
    }, title="Account")


def logout_user(request):
    logout(request)
    return redirect('index')


@login_required(login_url="/login")
def delete_account(request):
    if request.method == "POST":
        request.user.delete()
        return redirect('index')
    return _render(request, 'core/delete_account.html', title="Delete Account")


def directory(request):
    search = request.GET.get("search", "")
    products = None
    if search.strip() == "":
        products = Product.objects.filter(featured=True)
    else:
        products = Product.search(search)
    overflow = products.count() > 50 and search != None

    return _render(request, 'core/directory.html', context={
        "products": products[:50],
        "search": search,
        "overflow": overflow,
        "num_policies": PrivacyPolicy.objects.filter(published=True).count()
    }, title="Directory")


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
                edited = False
                if text != None and len(text.strip()) != 0 and request.user == suggestion.user:
                    suggestion.text = text
                    edited = True
                if comment != None and suggestion.can_super_edit(request.user):
                    suggestion.comment = comment
                    edited = True
                if status != None and suggestion.can_super_edit(request.user) and status in ['O', 'D', 'R']:
                    suggestion.status = status
                    edited = True
                suggestion.save()
                if edited and request.user != suggestion.user:
                    send_email("Suggestion response", "suggestion_update",
                               suggestion.user.email, context={})
    if request.GET.get("next", None) != None:
        return redirect(request.GET.get("next"))
    return _render(request, "core/suggestions.html", context={
        "open_suggestions": Suggestion.user_open_suggestions(request.user),
        "closed_suggestions": Suggestion.user_closed_suggestions(request.user),
        "submitted": request.GET.get("submitted", "False") == "True",
        "all_suggestions": Suggestion.all_open_suggestions() if request.user.is_superuser else []
    }, title="Suggestions")


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
            suggestion = Suggestion.objects.create(
                user=request.user, policy=policy, rubric_selection=rubric_selection, text=text)
            send_many_emails("[%s] New suggestion" % (policy.product.name if policy != None else "Global"), "suggestion_posted", [
                             user.email for user in suggestion.super_editors() if user.email != None], context={"suggestion": suggestion})
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
    }, title="Submit a Suggestion")
