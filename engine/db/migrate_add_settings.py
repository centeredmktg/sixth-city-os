"""One-time, idempotent: create the settings table (key/value JSON). create_all() makes
it for fresh DBs; prod (existing Postgres) needs this explicit DDL. Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine


def run_migration(engine) -> None:
    ddl = "CREATE TABLE IF NOT EXISTS settings (key VARCHAR PRIMARY KEY, value JSON)"
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("  settings table ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
