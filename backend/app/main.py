from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base

from app.api.auth import router as auth_router
from app.api.brokers import router as brokers_router
from app.api.trades import router as trades_router
from app.api.dashboard import router as dashboard_router
from app.api.journal import router as journal_router
from app.api.tags import router as tags_router
from app.api.reports import router as reports_router
from app.api.playbooks import router as playbooks_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="KongTrade",
    description="Trading journal and analytics platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth_router, brokers_router, trades_router, dashboard_router, journal_router, tags_router, reports_router, playbooks_router]:
    app.include_router(router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
