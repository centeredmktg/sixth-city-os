"""Idempotent: create the gmail_accounts table (per-rep encrypted refresh tokens).
create_all() makes it for fresh DBs; prod (existing Postgres) needs this. Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine

_DDL = """
CREATE TABLE IF NOT EXISTS gmail_accounts (
    email VARCHAR PRIMARY KEY,
    enc_refresh_token VARCHAR DEFAULT '',
    created_at TIMESTAMP
)
"""


def run_migration(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text(_DDL))
    print("  gmail_accounts table ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
