# KongTrade — Claude Instructions

## Karpathy Guidelines (always apply)

1. **Think before coding.** State assumptions. Ask when uncertain. Surface tradeoffs.
2. **Simplicity first.** Minimum code that solves the problem. No speculative features, no premature abstractions. If 200 lines could be 50, rewrite it.
3. **Surgical changes.** Touch only what you must. Match existing style. Don't refactor things that aren't broken.
4. **Goal-driven.** Define success criteria upfront. Loop until verified. "Make it work" is not a criterion.

## Project Context

KongTrade is a Tradezella clone — a full-stack trading journal and analytics platform.

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), SQLite (aiosqlite)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Broker:** robin_stocks v3.4.0 (unofficial Robinhood API)
- **No Docker, no PostgreSQL, no Redis, no Celery** — everything runs in-process

## Architecture

```
backend/app/
├── api/          # FastAPI route handlers
├── services/     # Business logic
├── models/       # SQLAlchemy ORM models
├── schemas/      # Pydantic request/response schemas
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

## Commands

```bash
# Start everything
./start.sh

# Backend only (hot reload)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend only (hot reload, proxies /api to :8000)
cd frontend && npm run dev

# Type check
cd frontend && npx tsc --noEmit
```

## Key Design Decisions

- **SQLite over PostgreSQL** — zero-config, no server process, good enough for single-user
- **No Celery** — broker sync runs in-process (takes ~5 seconds, acceptable UX)
- **Portable UUIDs** — `String(36)` instead of PostgreSQL-native UUID
- **Generic JSON** — `sqlalchemy.JSON` instead of PostgreSQL JSONB
- **Zella Score** = weighted composite: Win Rate (30%) + Profit Factor (25%) + Consistency (20%) + Risk Mgmt (15%) + Trade Quality (10%)
