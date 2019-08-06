from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Product, PrivacyPolicy
from .email import send_many_emails

@receiver(post_save, sender=Product)
def handle_product_update(sender, **kwargs):
    instance = kwargs["instance"]
    send_many_emails("[%s] Metadata updated" % instance.name, 'update', [user.email for user in instance.product.watchers()], {
        "product": instance,
        "updates": ["Metadata (name, description, etc) updated"]
    })

@receiver(post_save, sender=PrivacyPolicy)
def handle_policy_update(sender, **kwargs):
    instance = kwargs["instance"]
    send_many_emails("[%s] Policy updated" % instance.product.name, 'update', [user.email for user in instance.product.watchers()], {
        "product": instance.product,
        "updates": ["Policy (score, highlights, etc) updated"]
    })