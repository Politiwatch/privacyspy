import random
from django import template

register = template.Library()

@register.simple_tag(name="credit", takes_context=False)
def credit():
    credit = ["<a href='https://rmrm.io'>Miles McCain</a>",
              "<a href='https://github.com/ibarakaiev'>Igor Barakaiev</a>"]
    random.shuffle(credit)
    return ", ".join(credit)