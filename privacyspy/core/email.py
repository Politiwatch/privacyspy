from django.core.mail import send_mail, send_mass_mail
from django.template.loader import render_to_string
from django.conf import settings
from threading import Thread


def send_email(subject, template, to, context):
    text_render = render_to_string(
        "core/emails/" + template + ".txt", context=context)
    if settings.DEBUG:
        print("Sending email [%s] to %s:" % (subject, to))
        print(text_render)
    try:
        send_mail(subject, text_render, "PrivacySpy <noreply@mail.privacyspy.org>",
                  [to])
    except Exception as e:
        print(e)


def send_many_emails(subject, template, to, context):
    def send():
        text_render = render_to_string(
            "core/emails/" + template + ".txt", context=context)
        if settings.DEBUG:
            print("Sending email [%s] to %s:" % (subject, to))
            print(text_render)
        datatuples = [(subject, text_render, 'PrivacySpy <noreply@mail.privacyspy.org>', [
                       recipient]) for recipient in to]
        send_mass_mail(datatuples)
    thread = Thread(target=send)
    thread.setDaemon(True)
    thread.start()
