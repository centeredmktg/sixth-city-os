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


@pytest.fixture()
def client(session, monkeypatch):
    """TestClient whose DB dependency is the in-memory `session` fixture."""
    from fastapi.testclient import TestClient
    import web.server as server

    server.app.dependency_overrides[server.db_session] = lambda: session
    c = TestClient(server.app)
    try:
        yield c
    finally:
        server.app.dependency_overrides.clear()
