"""Boot-time schema self-heal: skips SQLite, isolates failures, additive-only list."""
import types

from engine.db.auto_migrate import run_startup_migrations, _MIGRATIONS


class _PgEngine:
    class dialect:
        name = "postgresql"


def test_skips_sqlite():
    from engine.db.base import make_engine
    # create_all builds the full SQLite schema; auto-migrate is a Postgres-only heal.
    assert run_startup_migrations(make_engine("sqlite:///:memory:")) == []


def test_isolates_a_failing_migration():
    def _boom(engine):
        raise RuntimeError("boom")
    good = types.SimpleNamespace(__name__="pkg.good", run_migration=lambda engine: None)
    bad = types.SimpleNamespace(__name__="pkg.bad", run_migration=_boom)
    # The bad one raises but is caught; the good one still runs; nothing propagates.
    assert run_startup_migrations(_PgEngine(), [bad, good]) == ["good"]


def test_list_is_additive_only():
    names = " ".join(m.__name__ for m in _MIGRATIONS)
    assert "vertical_rename" not in names            # data migration must NOT auto-run
    for expected in ("contact_hubspot_id", "messages", "settings", "enriched"):
        assert expected in names
