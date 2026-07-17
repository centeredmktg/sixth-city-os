"""GET /api/added — the claimed-companies drill-down behind the scoreboard's
"Added to CRM" count. Same `claimed` query backs both, so they can't disagree."""

from engine.db.models import AccountRow


def test_added_lists_claimed_and_matches_scoreboard(client, session):
    session.add(AccountRow(domain="a.example", name="A", net_new=True, claimed=True, total=90))
    session.add(AccountRow(domain="b.example", name="B", net_new=True, claimed=False, total=40))
    session.commit()

    added = client.get("/api/added").json()
    assert added["total"] == 1
    assert added["added"][0]["domain"] == "a.example"
    assert added["added"][0]["engine_status"] == "discovered"
    assert added["added"][0]["contact_count"] == 0

    assert client.get("/api/scoreboard").json()["in_crm"] == added["total"]
