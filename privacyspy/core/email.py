from django.core.mail import send_mail, send_mass_mail
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from threading import Thread
from django.contrib.auth.models import User


def send_email(subject, template, to, context, bcc=None, bcc_admins=False):
    if bcc == None:
        bcc = []
    if bcc_admins:
        admins = [user.email for user in User.objects.filter(is_superuser=True) if user != to]
        bcc.extend(admins)
        context["bcc_admins"] = True
    context["base_url"] = settings.BASE_URL
    text_render = render_to_string(
        "core/emails/" + template + ".txt", context=context)
    if settings.DEBUG:
        print("Sending email [%s] to %s:" % (subject, to))
        print(text_render)
    try:
        message = EmailMessage(subject, text_render, "PrivacySpy <noreply@mail.privacyspy.org>", [to], bcc=bcc).send()
    except Exception as e:
        print(e)


def send_many_emails(subject, template, to, context, bcc=None, bcc_admins=False):
    context["base_url"] = settings.BASE_URL
    def send():
        text_render = render_to_string(
            "core/emails/" + template + ".txt", context=context)
        if settings.DEBUG:
            print("Sending email [%s] to %s:" % (subject, to))
            print(text_render)
        datatuples = [(subject, text_render, 'PrivacySpy <noreply@mail.privacyspy.org>', [
                       recipient]) for recipient in to]
        send_mass_mail(datatuples)
    if bcc_admins:
        context["bcc_admins"] = True
        to.extend([user.email for user in User.objects.filter(is_superuser=True) if user not in to])
    if bcc:
        to.extend([item for item in bcc if item not in to])
    thread = Thread(target=send)
    thread.setDaemon(True)
    thread.start()
