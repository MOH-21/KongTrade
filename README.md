# KongTrade

Trading journal and analytics platform. Clone of Tradezella with Robinhood integration.

## Quick Start

```bash
git clone https://github.com/MOH-21/KongTrade.git
cd KongTrade
./start.sh
```

Open **http://localhost:5173**

That's it. No Docker, no PostgreSQL — SQLite + browser.

## Features

**Dashboard** — Zella Score (0-100 composite rating), Net P&L, Win Rate, Profit Factor, streaks, drawdown, calendar heatmap, recent trades

**Trade Log** — Auto-sync from Robinhood, manual entry, CSV import. Filter by symbol, asset type, side, status. Paginated, sortable table with full detail view.

**Journal** — Daily entries with emotional state tagging (confident, fearful, impulsive, disciplined, etc.), pre-market prep, end-of-day notes, lessons learned. Calendar view with P&L overlay.

**Reports** — Cumulative P&L chart, performance by symbol, by tag, by day of week. Profit factor, expectancy, Sharpe ratio, average hold time.

**Playbooks** — Define entry/exit criteria and risk rules. Track strategy performance and rule-following scores.

**Robinhood Integration** — Connect via robin_stocks with TOTP MFA support. Credentials encrypted at rest.

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Database | SQLite (aiosqlite) |
| Charts | Recharts |
| Broker API | robin_stocks 3.4.0 |

## Architecture

```
start.sh launches:
  backend :8000   — FastAPI (hot reload)
  frontend :5173  — Vite dev server (proxies /api → :8000)
```

## Development

```bash
# Backend
cd backend
cp .env.example .env
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## API Docs

Once running: **http://localhost:8000/docs** (Swagger UI)

## License

MIT
