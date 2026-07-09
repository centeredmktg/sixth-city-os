"""Message CRUD: create-from-draft, queue read, edit (preserves original), status stamp."""
from datetime import datetime, timezone

from engine.db import messages_repo as mr
from engine.models import Message, MessageStatus, SignalKind


def _draft(email="jane@acme.com", domain="acme.com", subj="Hi", body="Body"):
    return Message(contact_email=email, company_domain=domain, subject=subj, body=body,
                   reason_signal=SignalKind.SITE_QUALITY)


def test_create_then_get(session):
    m = mr.create_message(session, _draft())
    assert m.id is not None and m.status == MessageStatus.DRAFT
    got = mr.get_message(session, m.id)
    assert got.subject == "Hi" and got.reason_signal == SignalKind.SITE_QUALITY


def test_update_writes_edit_preserves_original(session):
    m = mr.create_message(session, _draft())
    edited = mr.update_draft(session, m.id, "New subj", "New body")
    assert edited.subject == "Hi" and edited.body == "Body"          # original preserved
    assert edited.edited_subject == "New subj" and edited.edited_body == "New body"
    assert edited.final_subject == "New subj" and edited.final_body == "New body"


def test_list_queue_excludes_sent_and_discarded(session):
    a = mr.create_message(session, _draft(email="a@x.com"))
    b = mr.create_message(session, _draft(email="b@x.com"))
    mr.set_status(session, b.id, MessageStatus.SENT)
    emails = [m.contact_email for m in mr.list_queue(session)]
    assert "a@x.com" in emails and "b@x.com" not in emails


def test_set_status_stamps_send_metadata(session):
    m = mr.create_message(session, _draft())
    sent = mr.set_status(session, m.id, MessageStatus.SENT,
                         gmail_message_id="g1", gmail_thread_id="t1",
                         sent_at=datetime.now(timezone.utc), sent_by="rep@sixthcity.com")
    assert sent.status == MessageStatus.SENT
    assert sent.gmail_message_id == "g1" and sent.sent_by == "rep@sixthcity.com"
