"""One-time, idempotent: add accounts.context_hash. create_all() makes new tables but
won't ALTER an existing one, so prod (Postgres) needs this. Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine


def run_migration(engine) -> None:
    ddl = "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS context_hash VARCHAR"
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("  accounts.context_hash ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
