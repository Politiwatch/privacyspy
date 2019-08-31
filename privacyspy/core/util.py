from colorsys import rgb_to_hls, hls_to_rgb
from django.contrib.auth.models import User


def adjust_color_lightness(r, g, b, factor):
    h, l, s = rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    l = max(min(l * factor, 1.0), 0.0)
    r, g, b = hls_to_rgb(h, l, s)
    return int(r * 255), int(g * 255), int(b * 255)


def lighten_color(r, g, b, factor=0.1):
    return adjust_color_lightness(r, g, b, 1 + factor)


def darken_color(r, g, b, factor=0.1):
    return adjust_color_lightness(r, g, b, 1 - factor)


def to_hex_code(r, g, b):
    return "%02x%02x%02x" % (r, g, b)


def username_exists(username):
    return User.objects.filter(username=username).count() > 0


def ratio_color(ratio):
    if ratio > -1:
        if ratio > 0.7:
            return "has-text-success"
        if ratio > 0.3:
            return "has-text-warning"
        return "has-text-danger"
    return "has-text-grey"

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def separate_rubric_questions_by_category(questions):
    rubric_categories = []
    rubric_categories = set(
        [question.category for question in questions])
    rubric_questions = {}
    for category in rubric_categories:
        rubric_questions[category] = []
        for question in [question for question in sorted(questions, key=lambda k: k.max_value) if question.category.lower() == category.lower()]:
            rubric_questions[category].append(question)
    return rubric_questions