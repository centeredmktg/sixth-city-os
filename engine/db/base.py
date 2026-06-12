"""
DB engine/session factory. Postgres in prod (Railway injects DATABASE_URL),
SQLite locally and in tests. The engine stays dataclass-based; this is the only
place that knows about a database connection.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from engine.config import CONFIG

Base = declarative_base()


def resolve_url(url: str | None = None) -> str:
    """Pick the DB URL and normalize it. Railway provides `postgres://`, but
    SQLAlchemy + psycopg3 needs `postgresql+psycopg://`. No URL: fatal in prod
    (Railway sets RAILWAY_ENVIRONMENT), SQLite fallback for local dev."""
    url = url if url is not None else CONFIG.database_url
    if not url:
        if os.getenv("RAILWAY_ENVIRONMENT"):
            raise RuntimeError("DATABASE_URL is required in production")
        return "sqlite:///pipeline_dev.db"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def make_engine(url: str | None = None):
    resolved = resolve_url(url)
    connect_args = {"check_same_thread": False} if resolved.startswith("sqlite") else {}
    return create_engine(resolved, connect_args=connect_args, future=True)


def make_session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def create_all(engine) -> None:
    # Import models so they register on Base before create_all.
    from engine.db import models  # noqa: F401
    Base.metadata.create_all(engine)
