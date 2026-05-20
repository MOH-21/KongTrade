# KongTrade

Trading journal and analytics platform. Clone of Tradezella with Robinhood integration.

Track every trade, replay your sessions, score your performance, and find your edge — all in one place.

## Quick Start

```bash
git clone https://github.com/MOH-21/KongTrade.git
cd KongTrade
./setup.sh
```

Open **http://localhost:3000**

`setup.sh` installs Docker if needed, configures permissions, generates secrets, and launches everything. No Python, Node, or PostgreSQL required — one command, done.

## Features

**Dashboard** — Zella Score (0-100 composite rating), Net P&L, Win Rate, Profit Factor, streaks, drawdown, calendar heatmap, recent trades

**Trade Log** — Auto-sync from Robinhood, manual entry, CSV import. Filter by symbol, asset type, side, status. Paginated, sortable table with full detail view.

**Journal** — Daily entries with emotional state tagging (confident, fearful, impulsive, disciplined, etc.), pre-market prep, end-of-day notes, lessons learned. Calendar view with P&L overlay.

**Reports** — Cumulative P&L chart, performance by symbol, by tag, by day of week. Profit factor, expectancy, Sharpe ratio, average hold time.

**Playbooks** — Define entry/exit criteria and risk rules. Track strategy performance and rule-following scores.

**Robinhood Integration** — Connect via robin_stocks with TOTP MFA support. Credentials encrypted at rest. Background sync via Celery.

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Database | PostgreSQL 16 |
| Queue | Celery + Redis |
| Broker API | robin_stocks 3.4.0 |
| Deployment | Docker Compose |

## Architecture

```
docker compose up -d starts:
  db:5432          — PostgreSQL
  redis:6379       — Redis
  backend:8000     — FastAPI (hot reload in dev)
  celery_worker    — Background broker sync
  frontend:3000    — React via nginx (proxies /api → backend)
```

## Development

```bash
# Backend (with hot reload, needs local PG/Redis or Docker)
cd backend
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (with hot reload + API proxy to :8000)
cd frontend
npm install
npm run dev
```

## API Docs

Once running: **http://localhost:8000/docs** (Swagger UI)

## License

MIT
