"""Encrypted Gmail refresh-token storage: round-trips with a key, degrades without one."""
from cryptography.fernet import Fernet

from engine.gmail import tokens


def _key():
    return Fernet.generate_key().decode()


def test_encrypt_decrypt_roundtrip(monkeypatch):
    monkeypatch.setenv("TOKEN_ENC_KEY", _key())
    enc = tokens.encrypt("rt-secret")
    assert enc and enc != "rt-secret"          # actually encrypted
    assert tokens.decrypt(enc) == "rt-secret"


def test_no_key_degrades_to_none(monkeypatch):
    monkeypatch.delenv("TOKEN_ENC_KEY", raising=False)
    assert tokens.encrypt("x") is None
    assert tokens.decrypt("x") is None


def test_store_and_get_refresh_token(session, monkeypatch):
    monkeypatch.setenv("TOKEN_ENC_KEY", _key())
    assert tokens.store_refresh_token(session, "rep@sixthcity.com", "rt-123") is True
    assert tokens.get_refresh_token(session, "rep@sixthcity.com") == "rt-123"
    assert tokens.is_connected(session, "rep@sixthcity.com") is True


def test_store_fails_without_key(session, monkeypatch):
    monkeypatch.delenv("TOKEN_ENC_KEY", raising=False)
    assert tokens.store_refresh_token(session, "rep@sixthcity.com", "rt") is False
    assert tokens.is_connected(session, "rep@sixthcity.com") is False
