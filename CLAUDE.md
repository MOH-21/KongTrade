# KongTrade — Claude Instructions

## Karpathy Guidelines (always apply)

1. **Think before coding.** State assumptions. Ask when uncertain. Surface tradeoffs.
2. **Simplicity first.** Minimum code that solves the problem. No speculative features, no premature abstractions. If 200 lines could be 50, rewrite it.
3. **Surgical changes.** Touch only what you must. Match existing style. Don't refactor things that aren't broken.
4. **Goal-driven.** Define success criteria upfront. Loop until verified. "Make it work" is not a criterion.

## Project Context

KongTrade is a Tradezella clone — a full-stack trading journal and analytics platform.

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL 16, Celery + Redis
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Infra:** Docker Compose (db, redis, backend, celery, frontend via nginx)
- **Broker:** robin_stocks v3.4.0 (unofficial Robinhood API)

## Architecture

```
backend/app/
├── api/          # FastAPI route handlers
├── services/     # Business logic
├── models/       # SQLAlchemy ORM models
├── schemas/      # Pydantic request/response schemas
├── workers/      # Celery tasks (broker sync)
├── utils/        # Security, encryption, robinhood client
├── main.py       # App entry, router registration
├── config.py     # Pydantic Settings from env
└── database.py   # Async engine + session

frontend/src/
├── api/          # Axios client + endpoint functions
├── components/   # Reusable UI components
├── pages/        # Route pages
├── hooks/        # Custom hooks (useAuth)
├── lib/          # Utilities (cn, formatCurrency, etc.)
└── types/        # TypeScript interfaces
```

## Common Commands

```bash
# Full stack
docker compose up -d

# Dev backend (hot reload)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Dev frontend (hot reload, proxies /api to :8000)
cd frontend && npm run dev

# Type check frontend
cd frontend && npx tsc --noEmit

# Alembic migrations
cd backend && source venv/bin/activate && alembic revision --autogenerate -m "description"
cd backend && source venv/bin/activate && alembic upgrade head
```

## Key Design Decisions

- **Python/FastAPI over Rails** because robin_stocks is Python-only
- **PostgreSQL JSONB** for flexible trade metadata (tags, running P&L, criteria)
- **Celery** for async Robinhood trade sync (I/O heavy, needs retry)
- **Docker Compose full-stack** so anyone can `docker compose up` with zero deps
- **Zella Score** = weighted composite: Win Rate (30%) + Profit Factor (25%) + Consistency (20%) + Risk Mgmt (15%) + Trade Quality (10%)
