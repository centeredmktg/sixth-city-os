"""
Offer recipes — Blueprint GTM PVP/PQS messages built from public-data signals.

Each recipe mirrors one of Jordan Crawford's Blueprint examples: a quantified,
named-competitor, standalone insight with a one-word-reply CTA (never "book a
meeting"). The insight IS the deliverable — outreach = product.

These are DETERMINISTIC templates filled from the account's data columns (no LLM,
no token tax). Real version may polish copy with the draft-cold-email skill, but
the structure + the proof come from data, exactly as the Blueprint demands.

select_offer() picks the strongest recipe an account's data supports.
"""

from __future__ import annotations

from engine.models import Account, Offer


def _s(a: Account, k: str) -> str:
    return (a.extra.get(k) or "").strip()


def _i(a: Account, k: str):
    v = _s(a, k)
    try:
        return int(float(v)) if v != "" else None
    except ValueError:
        return None


def _category(a: Account) -> str:
    return _s(a, "category") or a.vertical.value.replace("_", " ")


def ai_answer_gap(a: Account) -> Offer | None:
    """Flagship PVP — the moat. Ranks on Google but invisible to AI answer engines."""
    comp, cc, yc, q = _s(a, "ai_competitor"), _i(a, "ai_comp_cites"), _i(a, "ai_you_cites"), _i(a, "ai_queries")
    if not comp or cc is None or yc is None or not q:
        return None
    body = (f"I ran {q} buyer questions about {_category(a)} through ChatGPT and Perplexity. "
            f"{comp} showed up in {cc} of them. You weren't cited once — even though you rank "
            f"page one on Google for your category.\n\n"
            f"The companies we've watched fix this didn't publish more blog posts. They "
            f"restructured a few existing pages so the answer engines could actually parse "
            f"and quote them.")
    return Offer("AI Answer Gap Report", "PVP",
                 "AI answer-engine prompts (ChatGPT/Perplexity) + competitor-citation extraction + organic-rank check",
                 f"who AI recommends in {_category(a)} (it isn't you)", body,
                 'reply "send it" for the five prompts + full citation list')


def ad_spend_teardown(a: Account) -> Offer | None:
    """PVP — stale/single ad creative pointing at a slow homepage."""
    mine, theirs, since, ps = _i(a, "ad_creatives"), _i(a, "ad_competitor_creatives"), _s(a, "ad_since"), _i(a, "pagespeed_mobile")
    if mine is None or theirs is None or not since:
        return None
    load = f" that loads in {round((100 - (ps or 50)) / 12 + 3, 1)}s on mobile" if ps is not None else ""
    body = (f"Per Google's public Ads Transparency Center, you've run {mine} ad creative since "
            f"{since}, and it points to your homepage{load}. A competitor in your category is "
            f"rotating {theirs} creatives, each pointing to a dedicated quote-request page.\n\n"
            f"The biggest spend leak we find isn't bid strategy — it's sending paid traffic to a "
            f"homepage instead of a focused landing page.")
    return Offer("Wasted Ad Spend Teardown", "PVP",
                 "Google Ads Transparency Center (creative count + first-shown) + landing-page check + PageSpeed",
                 "your Google ad hasn't changed since " + since.lower(), body,
                 'reply and I\'ll send the side-by-side of your ad setup vs. theirs')


def review_velocity_map(a: Account) -> Offer | None:
    """PVP — losing the local pack on review recency/velocity (home services)."""
    you, comp, pos, q = _i(a, "rev_you_90d"), _s(a, "rev_comp_90d"), _i(a, "pack_pos"), _s(a, "pack_query")
    if you is None or not comp or pos is None or not q:
        return None
    body = (f"Over the last 90 days you've added {you} Google reviews. The three companies now "
            f"ranking above you in the \"{q}\" map pack added {comp} in the same window.\n\n"
            f"Review recency and velocity weight more heavily in local rankings than total count — "
            f"which is why a shop with fewer lifetime reviews can leapfrog you.")
    return Offer("Local Review Velocity Map", "PVP",
                 "Google Business Profile review timestamps (you vs. top-3) + local-pack position scrape",
                 f"why you slipped to #{pos} in the {q.split()[0].title()} map pack", body,
                 'reply and I\'ll send the 90-day review comparison across all four')


def new_hire_trigger(a: Account) -> Offer | None:
    """PQS — new marketing hire inheriting fixable technical debt. Mirror + curiosity."""
    role, blog = _s(a, "new_hire_role"), _s(a, "blog_quiet_year")
    if not role:
        return None
    blog_bit = f", and a blog that went quiet in {blog}" if blog else ""
    body = (f"Saw you posted a {role} role recently. We notice these because of what usually comes "
            f"next: the new hire inherits a site with no schema markup, a slow mobile load{blog_bit}.\n\n"
            f"The marketing leads who ramped fastest started by fixing the three technical issues "
            f"quietly capping every other channel — before launching anything new.")
    return Offer("New-Marketing-Hire Trigger", "PQS",
                 "Job postings (Indeed/LinkedIn) + technical site crawl (schema + mobile) + blog-recency check",
                 f"congrats on the {role.lower()} hire", body,
                 "curious which three we'd flag first on your site?")


# Priority order: flagship moat first, then most-scalable, then local, then trigger.
RECIPES = [ai_answer_gap, ad_spend_teardown, review_velocity_map, new_hire_trigger]


def select_offer(a: Account) -> Offer | None:
    """Return the strongest recipe the account's data supports, or None."""
    for recipe in RECIPES:
        offer = recipe(a)
        if offer:
            return offer
    return None
