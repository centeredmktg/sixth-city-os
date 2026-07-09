"""
Boot-time schema self-heal.

`create_all()` creates NEW tables but never ALTERs an existing one — so a column added
to a pre-existing table (e.g. `contacts.hubspot_id`) needs an explicit
`ADD COLUMN IF NOT EXISTS`. Relying on someone hand-running each `migrate_*` script
against Railway is the recurring "forgot the migration → prod 500s" trap. Instead we run
all the idempotent, ADDITIVE schema migrations at startup.

Every statement here is `ADD COLUMN / CREATE TABLE IF NOT EXISTS` — safe to run on every
boot. DATA migrations (e.g. `vertical_rename`, which rewrites values) are deliberately
excluded. SQLite is skipped entirely: `create_all()` already builds the complete schema
there, and SQLite doesn't support `ADD COLUMN IF NOT EXISTS` anyway.
"""

from __future__ import annotations

from engine.db import (
    migrate_add_enriched, migrate_add_net_new, migrate_add_places_enriched,
    migrate_add_contacts, migrate_add_contact_hubspot_id, migrate_add_messages,
    migrate_add_settings, migrate_add_gmail_accounts,
)

# Additive, idempotent schema migrations only — NOT vertical_rename (that's data).
_MIGRATIONS = [
    migrate_add_enriched,
    migrate_add_net_new,
    migrate_add_places_enriched,
    migrate_add_contacts,
    migrate_add_contact_hubspot_id,
    migrate_add_messages,
    migrate_add_settings,
    migrate_add_gmail_accounts,
]


def run_startup_migrations(engine, migrations=None) -> list[str]:
    """Run each additive migration once at boot. A single failure never blocks startup
    or the others (each is isolated). Returns the names that ran. No-op on SQLite."""
    migrations = migrations if migrations is not None else _MIGRATIONS
    if getattr(getattr(engine, "dialect", None), "name", "") == "sqlite":
        return []
    done: list[str] = []
    for m in migrations:
        try:
            m.run_migration(engine)
            done.append(m.__name__.rsplit(".", 1)[-1])
        except Exception as e:   # never let a migration crash the boot
            print(f"  [auto-migrate] {m.__name__} skipped: {type(e).__name__}: {e}")
    return done
