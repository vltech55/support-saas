from __future__ import annotations

from saas.billing.provider import PLAN_LIMITS
from saas.models import Plan


def test_plan_limits_ordered() -> None:
    assert PLAN_LIMITS[Plan.free].docs < PLAN_LIMITS[Plan.pro].docs < PLAN_LIMITS[Plan.enterprise].docs
    assert (
        PLAN_LIMITS[Plan.free].messages_per_month
        < PLAN_LIMITS[Plan.pro].messages_per_month
        < PLAN_LIMITS[Plan.enterprise].messages_per_month
    )


def test_all_plans_covered() -> None:
    assert set(PLAN_LIMITS.keys()) == set(Plan)
