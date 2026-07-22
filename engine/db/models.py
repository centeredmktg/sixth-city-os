"""
ORM rows mirroring the Account/Signal dataclasses. Persistence lives here ONLY;
the engine keeps operating on dataclasses (repo.py converts at the edges).
Account.domain is the primary key — the same dedupe key as the HubSpot net-new
gate, so the DB and HubSpot agree on identity.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from engine.db.base import Base


class AccountRow(Base):
    __tablename__ = "accounts"

    domain: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="")
    vertical: Mapped[str] = mapped_column(String, default="unknown")
    city: Mapped[str] = mapped_column(String, default="")
    state: Mapped[str] = mapped_column(String, default="OH")
    linkedin_url: Mapped[str] = mapped_column(String, default="")
    discovered_by: Mapped[str] = mapped_column(String, default="")
    extra: Mapped[dict] = mapped_column(JSON, default=dict)
    stage: Mapped[str] = mapped_column(String, default="discovered")
    hubspot_id: Mapped[str | None] = mapped_column(String, nullable=True)
    pushed: Mapped[bool] = mapped_column(Boolean, default=False)
    enriched: Mapped[bool] = mapped_column(Boolean, default=False)
    claimed: Mapped[bool] = mapped_column(Boolean, default=False)  # auto-claim pushed it to HubSpot
    claimed_at: Mapped["datetime | None"] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    context_hash: Mapped[str | None] = mapped_column(String, nullable=True, default=None)  # last HubSpot-synced context
    net_new: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=None)
    pursued: Mapped[bool] = mapped_column(Boolean, default=False)   # operator committed -> contacts sourced
    places_enriched: Mapped[bool] = mapped_column(Boolean, default=False)  # Places 2nd pass done

    # score (engine.models.Score)
    fit: Mapped[float] = mapped_column(Float, default=0.0)
    timing: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    band: Mapped[str] = mapped_column(String, default="R")
    score_rationale: Mapped[str] = mapped_column(String, default="")

    # route (engine.models.RouteDecision)
    route_recommended: Mapped[str] = mapped_column(String, default="hold")
    route_rationale: Mapped[str] = mapped_column(String, default="")
    route_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    route_confirmed_route: Mapped[str | None] = mapped_column(String, nullable=True)
    route_confirmed_by: Mapped[str] = mapped_column(String, default="")

    signals: Mapped[list["SignalRow"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["ContactRow"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class ContactRow(Base):
    """A decision-maker at a pursued company (Apollo). Sourced only after 'Pursue'."""
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_domain: Mapped[str] = mapped_column(ForeignKey("accounts.domain"))
    name: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String, default="")
    email: Mapped[str] = mapped_column(String, default="")
    linkedin_url: Mapped[str] = mapped_column(String, default="")
    seniority: Mapped[str] = mapped_column(String, default="")
    source: Mapped[str] = mapped_column(String, default="apollo")
    hubspot_id: Mapped[str | None] = mapped_column(String, nullable=True)

    account: Mapped["AccountRow"] = relationship(back_populates="contacts")


class SignalRow(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_domain: Mapped[str] = mapped_column(ForeignKey("accounts.domain"))
    kind: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String)
    value: Mapped[float] = mapped_column(Float, default=0.0)
    detail: Mapped[str] = mapped_column(String, default="")
    observed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    account: Mapped["AccountRow"] = relationship(back_populates="signals")


class MessageRow(Base):
    """A first-class outreach message (draft → sent) for a contact at a company.
    Identity is (contact_email, company_domain); original preserved, edit in edited_*."""
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contact_email: Mapped[str] = mapped_column(String, default="")
    company_domain: Mapped[str] = mapped_column(String, default="")
    reason_signal: Mapped[str | None] = mapped_column(String, nullable=True)
    subject: Mapped[str] = mapped_column(String, default="")
    body: Mapped[str] = mapped_column(String, default="")
    edited_subject: Mapped[str] = mapped_column(String, default="")
    edited_body: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="draft")
    gmail_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    gmail_thread_id: Mapped[str | None] = mapped_column(String, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_by: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SettingRow(Base):
    """Generic single-value settings store (key -> JSON). Holds the team-tunable
    'scoring_config' rubric; a JSON value means new levers need no migration."""
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)


class GmailAccountRow(Base):
    """A rep's connected Gmail, keyed by their email. Stores the OAuth refresh token
    ENCRYPTED at rest (Fernet, TOKEN_ENC_KEY) — a leaked DB never exposes live mailbox
    access. The send service exchanges it for a short-lived access token per send."""
    __tablename__ = "gmail_accounts"

    email: Mapped[str] = mapped_column(String, primary_key=True)
    enc_refresh_token: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
