# AI Customer Support SaaS

Multi-tenant, full-stack AI support assistant grounded in user-uploaded
documents. Next.js dashboard with auth, streaming chat with citations,
conversation history, document management, embeddable JavaScript widget,
admin overview with cost tracking, and Stripe-shaped billing — all behind
per-tenant data isolation enforced at the database layer.

> **Why this exists:** "ChatGPT for our docs" sounds simple until you
> actually ship it: multi-tenancy, auth, billing, data isolation,
> streaming, conversation persistence, a widget for any site. This
> project demonstrates all of it, end-to-end.

---

## Architecture

```
host site ── widget.js ─┐
                        ├─→ FastAPI ─→ Postgres (RLS on tenant_id)
admin dashboard ───────┘                   │
                                           ├─→ OpenAI embeddings
                                           ├─→ Claude streaming
                                           └─→ usage_events (cost tracking)

Auth:   AuthProvider Protocol  → dev (HS256 JWT) | clerk
Billing: BillingProvider Protocol → mock | stripe
```

Full mermaid diagram: [`docs/architecture.md`](./docs/architecture.md).

## Tenant isolation — two independent layers, fail-closed

1. **Application:** every query filters by `tenant_id`. The
   `tenant_scoped_session` dependency injects this after auth.
2. **Postgres RLS:** every tenant-scoped table has Row Level Security
   enabled. The policy recognizes three GUC states:
   - **set to a tenant UUID** → only that tenant's rows visible/writable
   - **empty (default)** → zero rows visible — *fail-closed*
   - **`__bootstrap__` sentinel** → bypass, used only by signup/login

   A handler that forgets to set the GUC reads zero rows, not all rows.
   The bypass cannot be triggered by accident — it requires an explicit
   `set_admin_guc()` call, audited in [`docs/multi-tenancy.md`](./docs/multi-tenancy.md).

The widget public endpoint authenticates by `tenant.public_key` (a
`pk_<urlsafe>` string), looks up the tenant in the unsecured `tenants`
directory, then sets the GUC for the rest of the request. Public keys
never grant admin operations.

Verify the model end-to-end:
```bash
docker compose exec backend pytest -v tests/test_tenant_isolation.py
```

## Auth + billing behind real interfaces

`AuthProvider` and `BillingProvider` are `typing.Protocol`s. Two
implementations of each are bundled:

| Surface     | dev/mock (default)                                | production            |
| ----------- | ------------------------------------------------- | --------------------- |
| `AUTH`      | `dev` — HS256 JWT, signup/login routes active     | `clerk` — JWKS verify |
| `BILLING`   | `mock` — in-memory subs + synthetic checkout URL  | `stripe` — Checkout + webhook |

Switching is one env var plus credentials. The dashboard never branches on
which provider is active. This is how the SaaS demoes without Clerk or
Stripe keys today and swaps to real providers the day they arrive.

## Stack

- **Backend:** Python 3.11, FastAPI async, SQLAlchemy 2 async + asyncpg, Alembic
- **DB:** Postgres 16 + pgvector (HNSW); RLS policies on every tenant-scoped table
- **LLM:** Claude `claude-sonnet-4-6` (streaming), OpenAI `text-embedding-3-small`
- **Auth:** PyJWT (HS256) for dev; Clerk for prod (interface stub bundled)
- **Billing:** mock for dev; Stripe SDK for prod (Checkout + webhook signature verify)
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind, route groups for the auth-gated app shell
- **Widget:** ~5 KB vanilla JS — no React on the host page; SSE via fetch + ReadableStream
- **Reliability:** Tenacity-shaped retries, structured request-id logging, content-hash dedupe on upload

## Quick start

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY and OPENAI_API_KEY at minimum.

make up                    # postgres + backend + frontend
make migrate               # creates schema + RLS policies
make seed                  # creates two demo tenants (Acme + Globex) with isolated docs

# Open the dashboard:
#   http://localhost:3002          marketing
#   http://localhost:3002/login    log in as one of:
#     admin@acme.example   / acmedemo1!
#     admin@globex.example / globexdemo1!
```

Each demo tenant has its own docs (Acme: billing + warranty; Globex:
delivery + returns). Ask the same question while logged in as each — the
answers come from disjoint corpora, which proves tenant isolation visibly.

## What's in each Next.js page

| Path             | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `/`              | Marketing + login/signup buttons                          |
| `/login` `/signup` | Dev auth flow (HS256 JWT in localStorage)               |
| `/dashboard`     | Overview totals + 14-day token/cost timeseries            |
| `/documents`     | Drag-drop PDF upload, list, delete                        |
| `/conversations` | Admin transcript review across all conversations          |
| `/billing`       | Current plan, usage vs cap, upgrade buttons               |
| `/widget`        | Embed snippet + live preview iframe                       |

## Embeddable widget

```html
<script src="http://localhost:8000/static/widget.js"
        data-public-key="pk_xxx"
        data-api="http://localhost:8000"></script>
```

The script renders a floating chat bubble on the host page. Conversations
persist in `localStorage` keyed by `public_key`. The widget streams with
`fetch` + ReadableStream — not `EventSource` — because EventSource can't
POST or carry custom headers.

## Make targets

```
make up         postgres + backend + frontend (dashboard on :3002, api on :8000)
make migrate    alembic upgrade head (creates schema + RLS policies)
make seed       create Acme + Globex demo tenants with isolated docs
make test       pytest (auth, chunking, plan limits, pricing)
make lint       ruff + mypy strict
make logs       tail logs
make psql       open psql shell
```

## Project layout

```
05-support-saas/
├── backend/
│   ├── src/saas/
│   │   ├── core/                config, logging, llm, pricing
│   │   ├── auth/                AuthProvider Protocol + dev (HS256) + clerk stub
│   │   ├── billing/             BillingProvider Protocol + mock + stripe stub
│   │   ├── tenancy/             contextvar + GUC helper for RLS
│   │   ├── rag/                 chunking, ingest, retrieve (per-tenant)
│   │   ├── chat/                prompts + SSE streaming + cost recording
│   │   ├── api/                 auth, documents, chat, billing, admin, widget public
│   │   ├── static/widget.js     embeddable vanilla JS widget
│   │   ├── db.py                async engine + set_tenant_guc helper
│   │   ├── models.py            tenants, users, subscriptions, documents, chunks,
│   │   │                        conversations, messages, usage_events
│   │   └── main.py              FastAPI app + static mount
│   ├── alembic/                 initial migration with pgvector + native enums + RLS policies
│   ├── scripts/seed_demo.py     creates two demo tenants with disjoint docs
│   └── tests/                   dev_auth, chunking, plan_limits, pricing
├── frontend/
│   ├── app/                     /, /login, /signup, /(app)/[dashboard|documents|conversations|billing|widget]
│   ├── components/              app-shell with localStorage JWT + navigation
│   └── lib/api.ts               typed fetch client
├── docs/                        architecture mermaid + design rationale
├── docker-compose.yml           postgres + backend + frontend
└── Makefile
```

## What this isn't (yet)

- OAuth / SAML — Clerk is the swap-in for that.
- Per-document permissions within a tenant — chunks are tenant-wide today.
- Distributed Stripe webhook idempotency (Redis-backed dedupe) — single-process is fine for the demo.
- A standalone widget bundle that doesn't depend on FastAPI to serve — production would publish it via CDN.

## License

MIT.
