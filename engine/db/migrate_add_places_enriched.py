"""One-time, idempotent: add accounts.places_enriched. create_all() won't ALTER the
existing accounts table, so prod (Postgres) needs the column add. Safe to re-run."""
from sqlalchemy import text

from engine.db.base import make_engine, create_all


def run_migration(engine) -> None:
    create_all(engine)
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS places_enriched BOOLEAN DEFAULT FALSE"))
    print("  accounts.places_enriched ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
