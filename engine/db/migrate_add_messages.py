"""One-time, idempotent: create the messages table. create_all() makes it for fresh
DBs; prod (existing Postgres) needs this explicit DDL. Safe to re-run."""
from sqlalchemy import text
from engine.db.base import make_engine

_DDL = """
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    contact_email VARCHAR DEFAULT '',
    company_domain VARCHAR DEFAULT '',
    reason_signal VARCHAR,
    subject VARCHAR DEFAULT '',
    body VARCHAR DEFAULT '',
    edited_subject VARCHAR DEFAULT '',
    edited_body VARCHAR DEFAULT '',
    status VARCHAR DEFAULT 'draft',
    gmail_message_id VARCHAR,
    gmail_thread_id VARCHAR,
    sent_at TIMESTAMP,
    sent_by VARCHAR DEFAULT '',
    created_at TIMESTAMP
)
"""


def run_migration(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text(_DDL))
    print("  messages table ensured")


def main():
    run_migration(make_engine())


if __name__ == "__main__":
    main()
