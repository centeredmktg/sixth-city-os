"""One-time, idempotent: add accounts.pursued + ensure the contacts table exists.
create_all() makes the new `contacts` table but won't ALTER the existing `accounts`
table, so prod (Postgres) needs the column add. Safe to re-run."""
from sqlalchemy import text

from engine.db.base import make_engine, create_all


def run_migration(engine) -> None:
    create_all(engine)   # creates the new `contacts` table if missing
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pursued BOOLEAN DEFAULT FALSE"))
    print("  accounts.pursued ensured + contacts table ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
