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
    net_new: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=None)

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
