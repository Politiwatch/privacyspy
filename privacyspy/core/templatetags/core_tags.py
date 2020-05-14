import random
from django import template

register = template.Library()

@register.simple_tag(name="credit", takes_context=False)
def credit():
    credit = ["<a href='https://miles.land'>Miles McCain</a>",
              "<a href='https://igor.fyi'>Igor Barakaiev</a>"]
    random.shuffle(credit)
    return ", ".join(credit)
