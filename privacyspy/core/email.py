from django.core.mail import send_mail
from django.template.loader import render_to_string

def send_email(subject, template, to, context):
    text_render = render_to_string(
        "core/emails/" + template + ".txt", context=context)
    print("Sending email [%s] to %s:" % (subject, to))
    print(text_render)
    try:
        send_mail(subject, text_render, "PrivacySpy <noreply@mail.privacyspy.org>",
                  [to])
    except Exception as e:
        print(e)
