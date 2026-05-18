from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from saas.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=10,
    future=True,
)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as s:
        try:
            yield s
        except Exception:
            await s.rollback()
            raise


async def set_tenant_guc(session: AsyncSession, tenant_id: str | None) -> None:
    """Set `app.tenant_id` as a session GUC. RLS policies on tenant-scoped tables
    compare current_setting('app.tenant_id', true) to the row's tenant_id.

    Passing None resets the GUC. We use set_config with is_local=true so the
    setting only persists for the current transaction — safer with pooled
    connections."""
    if tenant_id is None:
        await session.execute(text("SELECT set_config('app.tenant_id', '', true)"))
    else:
        await session.execute(
            text("SELECT set_config('app.tenant_id', :t, true)"),
            {"t": tenant_id},
        )
