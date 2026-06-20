"""extract_emails: domain-matched email harvest from homepage HTML (mailto + inline)."""
from engine.sources.site_audit import extract_emails


def test_extracts_domain_emails_incl_mailto_and_role():
    html = ('<a href="mailto:info@acmefab.com">email</a> reach john@acmefab.com '
            'or sales@acmefab.com. ignore vendor@othervendor.com')
    out = extract_emails(html, "acmefab.com")
    assert set(out) == {"info@acmefab.com", "john@acmefab.com", "sales@acmefab.com"}
    assert "vendor@othervendor.com" not in out   # third-party domain excluded


def test_handles_www_subdomain_and_empty():
    assert extract_emails("", "x.com") == []
    out = extract_emails("contact us at hi@x.com or team@mail.x.com", "www.x.com")
    assert "hi@x.com" in out and "team@mail.x.com" in out   # www-stripped; subdomain kept


from engine.sources.site_audit import extract_phones


def test_extracts_and_normalizes_phones():
    html = ('<a href="tel:+1 (216) 555-1234">call</a> or 330.555.9876 '
            'fax: 800-555-0000. junk 12345')
    out = extract_phones(html)
    assert "(216) 555-1234" in out
    assert "(330) 555-9876" in out
    assert "(800) 555-0000" in out
    assert all(p.startswith("(") for p in out)   # all normalized


def test_phones_empty_on_no_match():
    assert extract_phones("no numbers here, just 123") == []
