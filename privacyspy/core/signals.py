from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Product, PrivacyPolicy, Warning
from .email import send_many_emails
from django.utils import timezone
from datetime import timedelta

def is_product_recently_notified(product):
    return timezone.now() - product.last_email_blast < timedelta(hours=1)

@receiver(post_save, sender=Product)
def handle_product_update(sender, **kwargs):
    instance = kwargs["instance"]
    if is_product_recently_notified(instance):
        return
    instance.last_email_blast = timezone.now()
    instance.save()
    send_many_emails("[%s] Metadata updated" % instance.name, 'update', [user.email for user in instance.watchers()], {
        "product": instance,
        "updates": ["Metadata (name, description, etc) updated"]
    })

@receiver(post_save, sender=PrivacyPolicy)
def handle_policy_update(sender, **kwargs):
    instance = kwargs["instance"]
    if is_product_recently_notified(instance.product):
        return
    instance.product.last_email_blast = timezone.now()
    instance.product.save()
    send_many_emails("[%s] Policy updated" % instance.product.name, 'update', [user.email for user in instance.product.watchers()], {
        "product": instance.product,
        "updates": ["Policy (score, highlights, etc) updated"]
    })

@receiver(post_save, sender=Warning)
def handle_warning_published(sender, **kwargs):
    instance = kwargs["instance"]
    send_many_emails("[%s] Warning posted" % instance.product.name, 'warning', [user.email for user in instance.product.watchers()], {
        "product": instance.product,
        "warning": instance
    })