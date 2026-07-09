"""
Message persistence — the compose/send queue's first-class draft records.

CRUD for outreach messages: create-from-draft, read the queue, save the rep's edit
(kept separate from the original), and stamp status/send-metadata on send. Kept apart
from repo.py (accounts/contacts) since it's the outreach concern, not scoring state.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from engine.db.models import MessageRow
from engine.models import Message, MessageStatus, SignalKind

# Statuses that still want the rep's attention in the queue (not sent/dismissed).
_OPEN_STATUSES = (MessageStatus.DRAFT.value, MessageStatus.APPROVED.value)


def _to_row(m: Message) -> MessageRow:
    return MessageRow(
        contact_email=m.contact_email, company_domain=m.company_domain,
        reason_signal=(m.reason_signal.value if m.reason_signal else None),
        subject=m.subject, body=m.body,
        edited_subject=m.edited_subject, edited_body=m.edited_body,
        status=m.status.value if isinstance(m.status, MessageStatus) else str(m.status),
        gmail_message_id=m.gmail_message_id or None, gmail_thread_id=m.gmail_thread_id or None,
        sent_at=m.sent_at, sent_by=m.sent_by,
        created_at=m.created_at or datetime.now(timezone.utc),
    )


def _from_row(r: MessageRow) -> Message:
    return Message(
        id=r.id, contact_email=r.contact_email, company_domain=r.company_domain,
        reason_signal=(SignalKind(r.reason_signal) if r.reason_signal else None),
        subject=r.subject, body=r.body,
        edited_subject=r.edited_subject or "", edited_body=r.edited_body or "",
        status=MessageStatus(r.status),
        gmail_message_id=r.gmail_message_id or "", gmail_thread_id=r.gmail_thread_id or "",
        sent_at=r.sent_at, sent_by=r.sent_by or "", created_at=r.created_at,
    )


def create_message(session: Session, msg: Message) -> Message:
    """Insert a message; return it with its assigned id."""
    row = _to_row(msg)
    session.add(row)
    session.commit()
    return _from_row(row)


def get_message(session: Session, message_id: int) -> Message | None:
    row = session.get(MessageRow, message_id)
    return _from_row(row) if row else None


def list_queue(session: Session) -> list[Message]:
    """Open messages (draft/approved) the rep still needs to work, newest first."""
    rows = (session.query(MessageRow)
            .filter(MessageRow.status.in_(_OPEN_STATUSES))
            .order_by(MessageRow.id.desc()).all())
    return [_from_row(r) for r in rows]


def update_draft(session: Session, message_id: int, subject: str, body: str) -> Message | None:
    """Save the rep's edit into edited_* — the AI/template original is preserved."""
    row = session.get(MessageRow, message_id)
    if row is None:
        return None
    row.edited_subject, row.edited_body = subject, body
    session.commit()
    return _from_row(row)


def set_status(session: Session, message_id: int, status: MessageStatus, **send_meta) -> Message | None:
    """Transition status and optionally stamp send metadata
    (gmail_message_id, gmail_thread_id, sent_at, sent_by)."""
    row = session.get(MessageRow, message_id)
    if row is None:
        return None
    row.status = status.value if isinstance(status, MessageStatus) else str(status)
    for k in ("gmail_message_id", "gmail_thread_id", "sent_at", "sent_by"):
        if k in send_meta and send_meta[k] is not None:
            setattr(row, k, send_meta[k])
    session.commit()
    return _from_row(row)
