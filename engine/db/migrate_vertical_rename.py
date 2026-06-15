"""One-time, idempotent migration: rename persisted `vertical` values to the
canonical taxonomy. Runs against whatever DATABASE_URL resolves to (sqlite local,
Railway Postgres in prod). `from_orm` is hardened as a backstop, but run this so
reporting/scoring see the correct values, not UNKNOWN."""
from sqlalchemy import text

from engine.db.base import make_engine

RENAMES = {
    "industrial_b2b": "industrial_manufacturing",
    "home_services": "home_construction",
    "ecommerce": "retail_ecommerce",
}


def run_migration(engine) -> None:
    with engine.begin() as conn:
        for old, new in RENAMES.items():
            r = conn.execute(
                text("UPDATE accounts SET vertical=:new WHERE vertical=:old"),
                {"new": new, "old": old},
            )
            print(f"  {old} -> {new}: {r.rowcount} rows")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
