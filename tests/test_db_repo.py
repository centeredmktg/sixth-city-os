from engine.db.base import resolve_url


def test_resolve_url_normalizes_railway_postgres_scheme():
    # Railway hands out postgres:// ; SQLAlchemy + psycopg3 needs postgresql+psycopg://
    out = resolve_url("postgres://u:p@host:5432/db")
    assert out == "postgresql+psycopg://u:p@host:5432/db"


def test_resolve_url_passes_sqlite_through():
    assert resolve_url("sqlite:///tmp/x.db") == "sqlite:///tmp/x.db"
