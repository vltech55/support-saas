from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from saas.core.config import settings
from saas.models import Plan


@dataclass(frozen=True)
class PlanLimits:
    docs: int
    messages_per_month: int


PLAN_LIMITS: dict[Plan, PlanLimits] = {
    Plan.free: PlanLimits(
        docs=settings.plan_free_docs,
        messages_per_month=settings.plan_free_messages,
    ),
    Plan.pro: PlanLimits(
        docs=settings.plan_pro_docs,
        messages_per_month=settings.plan_pro_messages,
    ),
    Plan.enterprise: PlanLimits(
        docs=settings.plan_enterprise_docs,
        messages_per_month=settings.plan_enterprise_messages,
    ),
}


@dataclass(frozen=True)
class CheckoutSession:
    url: str
    session_id: str


class BillingProvider(Protocol):
    name: str
    supports_checkout: bool

    async def create_checkout(self, tenant_id: UUID, plan: Plan, return_url: str) -> CheckoutSession:
        """Create a hosted-checkout session for upgrading to `plan`."""
        ...

    async def cancel(self, tenant_id: UUID) -> None: ...

    async def handle_webhook(self, payload: bytes, signature: str | None) -> dict:
        """Verify the webhook signature and apply the resulting state change. Returns
        a small dict describing what happened, suitable for the audit log."""
        ...


def build_billing_provider() -> BillingProvider:
    from saas.billing.mock import MockBillingProvider
    from saas.billing.stripe_provider import StripeBillingProvider

    if settings.billing_provider == "stripe" and settings.stripe_secret_key:
        return StripeBillingProvider()
    return MockBillingProvider()
