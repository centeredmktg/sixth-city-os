import pytest

from engine.db.base import make_engine, create_all, make_session_factory


@pytest.fixture()
def session():
    """Fresh in-memory SQLite DB per test."""
    engine = make_engine("sqlite:///:memory:")
    create_all(engine)
    Session = make_session_factory(engine)
    s = Session()
    try:
        yield s
    finally:
        s.close()
