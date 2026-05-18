from __future__ import annotations

from uuid import UUID

import stripe
from sqlalchemy import select

from saas.billing.provider import CheckoutSession
from saas.core.config import settings
from saas.core.logging import get_logger
from saas.db import SessionLocal, set_tenant_guc
from saas.models import Plan, Subscription, SubscriptionStatus

log = get_logger(__name__)

_PRICE_BY_PLAN = {
    Plan.pro: settings.stripe_price_pro,
    Plan.enterprise: settings.stripe_price_enterprise,
}


class StripeBillingProvider:
    """Real Stripe Checkout integration. Activated by BILLING_PROVIDER=stripe
    plus a populated STRIPE_SECRET_KEY. The dashboard never branches on which
    provider is active; both share the same surface via `BillingProvider`.
    """

    name = "stripe"
    supports_checkout = True

    def __init__(self) -> None:
        stripe.api_key = settings.stripe_secret_key

    async def create_checkout(self, tenant_id: UUID, plan: Plan, return_url: str) -> CheckoutSession:
        if plan == Plan.free:
            raise ValueError("cannot checkout into the free plan")
        price = _PRICE_BY_PLAN.get(plan)
        if not price:
            raise ValueError(f"STRIPE_PRICE_{plan.value.upper()} env not set")
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price, "quantity": 1}],
            success_url=return_url + "?ok=1",
            cancel_url=return_url + "?ok=0",
            client_reference_id=str(tenant_id),
            metadata={"tenant_id": str(tenant_id), "plan": plan.value},
        )
        log.info("stripe_checkout_created", tenant_id=str(tenant_id), plan=plan.value)
        return CheckoutSession(url=session.url or "", session_id=session.id)

    async def cancel(self, tenant_id: UUID) -> None:
        async with SessionLocal() as session:
            await set_tenant_guc(session, str(tenant_id))
            sub = (
                await session.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
            ).scalar_one()
            if sub.external_id:
                stripe.Subscription.delete(sub.external_id)
            sub.status = SubscriptionStatus.canceled
            sub.plan = Plan.free
            await session.commit()
        log.info("stripe_subscription_canceled", tenant_id=str(tenant_id))

    async def handle_webhook(self, payload: bytes, signature: str | None) -> dict:
        if not settings.stripe_webhook_secret or not signature:
            return {"received": False, "reason": "missing signature secret"}
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.stripe_webhook_secret
            )
        except (stripe.error.SignatureVerificationError, ValueError) as exc:
            log.warning("stripe_webhook_bad_signature", error=str(exc))
            return {"received": False, "reason": "bad signature"}

        et = event["type"]
        data = event["data"]["object"]
        if et == "checkout.session.completed":
            tenant_id = UUID(data["metadata"]["tenant_id"])
            plan = Plan(data["metadata"]["plan"])
            async with SessionLocal() as session:
                await set_tenant_guc(session, str(tenant_id))
                sub = (
                    await session.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
                ).scalar_one()
                sub.plan = plan
                sub.status = SubscriptionStatus.active
                sub.external_id = data.get("subscription")
                await session.commit()
            return {"received": True, "type": et, "tenant_id": str(tenant_id), "plan": plan.value}

        if et in ("customer.subscription.deleted", "customer.subscription.updated"):
            tenant_id_meta = data.get("metadata", {}).get("tenant_id")
            if not tenant_id_meta:
                return {"received": True, "type": et, "noop": "no tenant metadata"}
            tenant_id = UUID(tenant_id_meta)
            status = SubscriptionStatus.canceled if et.endswith("deleted") else SubscriptionStatus.active
            async with SessionLocal() as session:
                await set_tenant_guc(session, str(tenant_id))
                sub = (
                    await session.execute(select(Subscription).where(Subscription.tenant_id == tenant_id))
                ).scalar_one()
                sub.status = status
                if status == SubscriptionStatus.canceled:
                    sub.plan = Plan.free
                await session.commit()
            return {"received": True, "type": et, "tenant_id": str(tenant_id), "status": status.value}

        return {"received": True, "type": et, "noop": True}
