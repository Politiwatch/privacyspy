from django.shortcuts import render, get_object_or_404, redirect
from .models import Product, PrivacyPolicy, RubricQuestion, RubricSelection, Suggestion, RubricOption, LoginKey
from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import logout
import re
from .util import username_exists


def index(request):
    return render(request, 'core/index.html', context={
        "title": "Making online privacy (slightly) simpler",
        "n": range(60),
        "keywords": ["privacy", "is", "a",
                     "fundamental", "right"],
        "products": Product.objects.filter(featured=True),
        "user": request.user
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
        "policy": policy,
        "user": request.user
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
                else:
                    if question.answer != None:
                        question.answer.delete()
            policy.calculate_score()
            actions.append("Successfully updated ratings.")

    return render(request, 'core/edit_policy.html', context={
        "policy": policy,
        "title": "Editing Privacy Policy",
        "actions": actions,
        "rubric_questions": policy.questions_with_selections(),
        "user": request.user
    })


def login_user(request):
    error = None
    message = None
    if request.user.is_authenticated:
        return redirect('index')
    if LoginKey.log_in_via_token(request):
        return redirect('index')
    if request.method == "POST":
        email = request.POST.get("email", "")
        if re.fullmatch(r"[^@]+@[^@]+\.[^@]+", email):
            LoginKey.go_for_email(email)
            message = "A login link has been sent to the email address you provided. Check your inbox."
        else:
            error = "Please enter a valid email address!"
    return render(request, 'core/login.html', context={
        "error": error,
        "message": message,
        "title": "Log In or Sign Up",
        "user": request.user
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
    return render(request, 'core/manage_account.html', context={
        "user": request.user,
        "request": request,
        "title": "My Account",
        "error": error,
        "message": message
    })


def logout_user(request):
    logout(request)
    return redirect('index')


@login_required
def delete_account(request):
    if request.method == "POST":
        request.user.delete()
        return redirect('index')
    return render(request, 'core/delete_account.html', context={
        "title": "Delete Account",
        "user": request.user,
        "request": request,
    })


def directory(request):
    return render(request, 'core/directory.html', context={
        "title": "Product Directory",
        "user": request.user,
        "request": request,
        "products": Product.objects.all(),
        "num_policies": PrivacyPolicy.objects.filter(published=True).count()
    })

@login_required
def suggestions(request):
    if request.method == "POST":
        suggestion_id = request.POST.get("id", None)
        if suggestion_id != None:
            suggestion = get_object_or_404(Suggestion, id=suggestion_id)
            if suggestion.status == "O" or request.user.is_superuser:
                text = request.POST.get("text", None)
                comment = request.POST.get("comment", None)
                status = request.POST.get("status", None)
                if text != None and len(text.strip()) != 0 and request.user == suggestion.user:
                    suggestion.text = text
                if comment != None and request.user.is_superuser:
                    suggestion.comment = comment
                if status != None and request.user.is_superuser and status in ['O', 'D', 'R']:
                    suggestion.status = status
                suggestion.save()
    if request.GET.get("next", None) != None:
        return redirect(request.GET.get("next"))
    
    return render(request, "core/suggestions.html", context={
        "open_suggestions": Suggestion.user_open_suggestions(request.user),
        "closed_suggestions": Suggestion.user_closed_suggestions(request.user),
        "user": request.user,
        "title": "Suggestions",
        "request": request,
        "submitted": request.GET.get("submitted", "False") == "True",
        "all_suggestions": Suggestion.all_open_suggestions() if request.user.is_superuser else [] 
    })

@login_required
def create_suggestion(request):
    error = None
    if request.method == "POST":
        print(request.POST)
        text = request.POST.get("text", None)
        policy_id = request.POST.get("policy", None)
        rubric_selection_id = request.POST.get("rubric-selection", None)
        if len(text.strip()) != 0:
            policy = get_object_or_404(PrivacyPolicy, id=int(policy_id)) if policy_id != None else None
            rubric_selection = get_object_or_404(RubricSelection, id=int(rubric_selection_id)) if rubric_selection_id != None else None
            Suggestion.objects.create(user=request.user, policy=policy, rubric_selection=rubric_selection, text=text)
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
        rubric_selection = get_object_or_404(RubricSelection, id=int(rubric_selection_id))
    return render(request, "core/create_suggestion.html", context={
        "user": request.user,
        "request": request,
        "error": error,
        "policy": policy,
        "rubric_selection": rubric_selection,
        "text": request.GET.get("text", None),
        "title": "Submit a Suggestion"
    })