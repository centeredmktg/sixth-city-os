/* ============================================================
   Pipeline Engine — mock data + engine-accurate helpers
   Field names mirror engine/models.py. Scoring mirrors
   engine/scoring/abcr.py; routing mirrors engine/routing.py;
   rev-share mirrors engine/attribution/dashboard.py.
   ============================================================ */

/* ---- Enums (engine/models.py) ---- */
const Vertical = {
  industrial_b2b: "Industrial / B2B",
  home_services: "Home Services",
  healthcare: "Healthcare",
  legal: "Legal",
  ecommerce: "Ecommerce",
  unknown: "Unknown",
};
const SignalKind = {
  site_quality: "Site Quality",
  seo_gap: "Organic Visibility",
  keyword_gap: "Keyword Gap",
  local_seo_gap: "Local SEO Gap",
  backlink_gap: "Backlink Gap",
  content_gap: "Content Gap",
  ai_citation_gap: "AI Answer Gap",
  ads_stale: "Stale Ad Creative",
  ads_active: "Ads Active",
  hiring_marketing: "Hiring Marketing",
  new_location: "New Location",
  review_velocity: "Review Velocity",
};
const SourceLabel = {
  pagespeed: "PageSpeed / Lighthouse",
  clay: "Clay (free payload)",
  seo_gap: "SEO tool (Ahrefs/SEMrush)",
  public_signals: "Public-signal moat",
  google_places: "Google Places",
  google_ads: "Ads Transparency",
  indeed: "Job Boards",
  semrush: "SEMrush",
  referral: "Referral (manual)",
};
const RouteLabel = { closer: "Closer", nurture: "Nurture", hold: "Hold", reject: "Reject" };

/* ---- Scoring (engine/scoring/abcr.py) ---- */
const FIT_WEIGHT = 0.4, TIMING_WEIGHT = 0.6;
function fitScore(state) { return Math.min((state === "OH" ? 70 + 15 : 70), 100); }
const TIMING_WEIGHT_BY_KIND = {
  ai_citation_gap: 70,   // flagship moat pain
  ads_active: 60,
  ads_stale: 55,
  hiring_marketing: 50,
  local_seo_gap: 45,
  keyword_gap: 45,
  review_velocity: 45,
  seo_gap: 40,
  backlink_gap: 30,
  content_gap: 25,
};
function timingScore(signals) {
  if (!signals.length) return 0;
  // Diminishing returns (mirrors current abcr.py): strongest signal counts full,
  // each next less — many gaps still warm, but stacking doesn't trivially max out.
  const contribs = signals.map((s) =>
    s.kind === "site_quality" ? (100 - s.value) * 0.8 : (TIMING_WEIGHT_BY_KIND[s.kind] ?? s.value * 0.3)
  ).sort((a, b) => b - a);
  let timing = 0;
  contribs.forEach((c, i) => { timing += c * Math.pow(0.55, i); });
  return Math.min(timing, 100);
}
function band(total) { return total >= 75 ? "A" : total >= 55 ? "B" : total >= 35 ? "C" : "R"; }

/* ---- Office-hub proximity (engine/geo.py) — local advantage boost ---- */
const HUB_CITIES = ["Cleveland", "Akron", "Youngstown"]; // demo hubs; swap real six
const PROXIMITY_BOOST = 1.12;
function proximityWeight(acct) {
  return HUB_CITIES.some((c) => c.toLowerCase() === (acct.city || "").toLowerCase()) ? PROXIMITY_BOOST : 1.0;
}
function computeScore(acct) {
  const fit = fitScore(acct.state);
  const timing = timingScore(acct.signals);
  const base = fit * FIT_WEIGHT + timing * TIMING_WEIGHT;
  const prox = proximityWeight(acct);
  const total = Math.min(100, base * prox);
  const proxNote = prox !== 1.0 ? ` × proximity ${prox}` : "";
  return {
    fit: Math.round(fit * 10) / 10,
    timing: Math.round(timing * 10) / 10,
    total: Math.round(total * 10) / 10,
    band: band(total),
    proximity: prox,
    rationale: `fit ${fit.toFixed(0)} × ${FIT_WEIGHT} + timing ${timing.toFixed(0)} × ${TIMING_WEIGHT}${proxNote}`,
  };
}

/* ---- Routing (engine/routing.py) ---- */
const IN_MARKET_TIMING = 55.0, VIABLE_FIT = 60.0;
function recommendRoute(score) {
  if (!score) return { recommended: "hold", rationale: "unscored" };
  if (score.timing >= IN_MARKET_TIMING)
    return { recommended: "closer", rationale: `in-market now (timing ${score.timing.toFixed(0)} ≥ ${IN_MARKET_TIMING.toFixed(0)})` };
  if (score.fit >= VIABLE_FIT)
    return { recommended: "nurture", rationale: `good fit (${score.fit.toFixed(0)}) but cold (timing ${score.timing.toFixed(0)}) — marketing nurtures` };
  if (score.fit >= VIABLE_FIT * 0.6)
    return { recommended: "hold", rationale: "marginal on both axes — revisit later" };
  return { recommended: "reject", rationale: "not a fit" };
}

/* ---- Rev-share (engine/attribution/dashboard.py) ---- */
const REV_SHARE_RATE = 0.05, TAIL_MONTHS = 12, MONTHLY_FLOOR = 500.0;
function qualifies(a) { return a.machine_sourced && !!a.signed_at; } // net-new gate enforced upstream
function owedLine(a) {
  const q = qualifies(a);
  const tail = q ? a.service_fee_monthly * TAIL_MONTHS * REV_SHARE_RATE : 0;
  return { ...a, qualifying: q, twelve_mo_rev_share: Math.round(tail * 100) / 100,
    note: q ? "qualifying" : (!a.machine_sourced ? "not machine-sourced" : "no signed date") };
}

/* ---- helper: build a signal ---- */
const sig = (kind, source, value, detail) => ({ kind, source, value, detail });

/* draft a templated outreach (mirrors modules/draft_cold_email.py) */
function urgency(s) { return s.kind === "site_quality" ? 100 - s.value : s.value; }
function draftOutreach(acct) {
  const strongest = acct.signals.slice().sort((a, b) => urgency(b) - urgency(a))[0];
  const reason = strongest ? strongest.detail : "we noticed an opportunity on your site";
  return {
    account_domain: acct.domain,
    reason_signal: strongest ? strongest.kind : null,
    subject: `Quick note on ${acct.name.split(" ").slice(0, 2).join(" ")}'s website`,
    body: `Hi ${acct.contact ? acct.contact.first : "there"} — we ran ${acct.name} through our free website evaluation. ${reason}\n\nWe help ${Vertical[acct.vertical].toLowerCase()} businesses across Northeast Ohio turn that into more leads and booked revenue — not just traffic. Worth a quick 15-minute look at what we found?\n\n— ${"Centered / Sixth City Marketing"}`,
  };
}

/* ---- Pain-qualified gate (engine/routing.py): ≥2 distinct signals agree ---- */
function painQualified(acct) {
  return new Set(acct.signals.map((s) => s.kind)).size >= 2;
}

/* ============================================================
   Offer recipes — Blueprint GTM PVP/PQS (engine/offers/recipes.py)
   Quantified, names a competitor, one-word-reply CTA. The PVP IS
   the deliverable. Deterministic templates filled from account data.
   ============================================================ */
function offerAiAnswerGap(a) {
  if (!a.ai_competitor || a.ai_comp_cites == null || a.ai_you_cites == null || !a.ai_queries) return null;
  const cat = a.category || Vertical[a.vertical].toLowerCase();
  return { recipe: "AI Answer Gap Report", kind: "PVP",
    data_recipe: "AI answer-engine prompts (ChatGPT/Perplexity) + competitor-citation extraction + organic-rank check",
    subject: `who AI recommends in ${cat} (it isn't you)`,
    body: `I ran ${a.ai_queries} buyer questions about ${cat} through ChatGPT and Perplexity. ${a.ai_competitor} showed up in ${a.ai_comp_cites} of them. You weren't cited once — even though you rank page one on Google.\n\nThe companies that fixed this didn't publish more blog posts. They restructured a few existing pages so the answer engines could actually parse and quote them.`,
    cta: 'reply "send it" for the five prompts + full citation list' };
}
function offerAdSpend(a) {
  if (a.ad_creatives == null || a.ad_competitor_creatives == null || !a.ad_since) return null;
  return { recipe: "Wasted Ad Spend Teardown", kind: "PVP",
    data_recipe: "Google Ads Transparency Center (creative count + first-shown) + landing-page check + PageSpeed",
    subject: `your Google ad hasn't changed since ${a.ad_since.toLowerCase()}`,
    body: `Per Google's public Ads Transparency Center, you've run ${a.ad_creatives} ad creative since ${a.ad_since}, and it points to your homepage. A competitor in your category is rotating ${a.ad_competitor_creatives} creatives, each pointing to a dedicated quote-request page.\n\nThe biggest spend leak we find isn't bid strategy — it's sending paid traffic to a homepage instead of a focused landing page.`,
    cta: "reply and I'll send the side-by-side of your ad setup vs. theirs" };
}
function offerReviewVelocity(a) {
  if (a.rev_you_90d == null || !a.rev_comp_90d || a.pack_pos == null || !a.pack_query) return null;
  return { recipe: "Local Review Velocity Map", kind: "PVP",
    data_recipe: "Google Business Profile review timestamps (you vs. top-3) + local-pack position scrape",
    subject: `why you slipped to #${a.pack_pos} in the ${a.pack_query.split(" ")[0]} map pack`,
    body: `Over the last 90 days you've added ${a.rev_you_90d} Google reviews. The three companies now ranking above you in the "${a.pack_query}" map pack added ${a.rev_comp_90d} in the same window.\n\nReview recency and velocity weight more heavily in local rankings than total count — which is why a shop with fewer lifetime reviews can leapfrog you.`,
    cta: "reply and I'll send the 90-day review comparison across all four" };
}
function offerNewHire(a) {
  if (!a.new_hire_role) return null;
  const blog = a.blog_quiet_year ? `, and a blog that went quiet in ${a.blog_quiet_year}` : "";
  return { recipe: "New-Marketing-Hire Trigger", kind: "PQS",
    data_recipe: "Job postings (Indeed/LinkedIn) + technical site crawl (schema + mobile) + blog-recency check",
    subject: `congrats on the ${a.new_hire_role.toLowerCase()} hire`,
    body: `Saw you posted a ${a.new_hire_role} role recently. We notice these because of what usually comes next: the new hire inherits a site with no schema markup, a slow mobile load${blog}.\n\nThe marketing leads who ramped fastest started by fixing the three technical issues quietly capping every other channel — before launching anything new.`,
    cta: "curious which three we'd flag first on your site?" };
}
function selectOffer(a) {
  return offerAiAnswerGap(a) || offerAdSpend(a) || offerReviewVelocity(a) || offerNewHire(a) || null;
}

/* ============================================================
   ACCOUNTS — raw records (models.py field names)
   ============================================================ */
function mk(r) {
  const score = computeScore(r);
  const rec = recommendRoute(score);
  const route = {
    recommended: rec.recommended, rationale: rec.rationale,
    confirmed: r.confirmed ?? false,
    confirmed_route: r.confirmed_route ?? null,
    confirmed_by: r.confirmed_by ?? "",
    effective: (r.confirmed && r.confirmed_route) ? r.confirmed_route : rec.recommended,
    history: r.history ?? [],
  };
  const a = { ...r, score, route };
  a.pain_qualified = painQualified(a);
  a.offer = a.route.effective === "closer" ? selectOffer(a) : null;
  a.outreach = r.outreach ?? draftOutreach(a);
  return a;
}

const RAW = [
  /* ---------- CLOSER QUEUE (confirmed, in a sequence) ---------- */
  { id: "lakeshore", name: "Lakeshore Tool & Stamping", domain: "lakeshoretool.com",
    vertical: "industrial_b2b", city: "Cleveland", state: "OH", hubspot_id: "HS-48217",
    discovered_by: "pagespeed", stage: "engaged", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    category: "precision stamping & CNC machining",
    ai_competitor: "Trumpf", ai_comp_cites: 4, ai_you_cites: 0, ai_queries: 5,
    contact: { first: "Dave", name: "Dave Kowalczyk", title: "Operations Manager", email: "dkowalczyk@lakeshoretool.com" },
    signals: [
      sig("site_quality", "pagespeed", 31, "Mobile site scores 31/100 on Google PageSpeed — LCP 6.8s, no mobile viewport tag."),
      sig("ai_citation_gap", "public_signals", 4, "Invisible to AI answer engines: Trumpf is cited 4× across buyer queries where Lakeshore is cited 0× — despite ranking page one on Google."),
      sig("ads_active", "google_ads", 0.85, "Actively running Google Ads on “CNC machining Ohio” — budget already exists."),
      sig("keyword_gap", "seo_gap", 47, "Competitors rank for 47 high-intent terms Lakeshore doesn't show up for — direct page-one opportunity."),
    ],
    history: [["scored", "Jun 1"], ["routed → closer", "Jun 1"], ["confirmed", "Jun 1 · J. Sammon"], ["pushed to HubSpot", "Jun 2"], ["engaged — replied", "Jun 6"]] },

  { id: "buckeye", name: "Buckeye Basement Solutions", domain: "buckeyebasements.com",
    vertical: "home_services", city: "Akron", state: "OH", hubspot_id: "HS-48233",
    discovered_by: "pagespeed", stage: "engaged", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    rev_you_90d: 2, rev_comp_90d: "21, 18, 16", pack_pos: 4, pack_query: "basement waterproofing near me",
    contact: { first: "Renee", name: "Renee Adams", title: "Owner", email: "renee@buckeyebasements.com" },
    signals: [
      sig("site_quality", "pagespeed", 34, "Mobile site scores 34/100 — render-blocking scripts, 4.1MB hero image, no caching."),
      sig("ads_active", "google_ads", 0.8, "Running Local Services Ads for “basement waterproofing” — spending now."),
      sig("review_velocity", "public_signals", 18, "Added 2 Google reviews in 90 days while local competitors added 21, 18, 16 — losing the map pack on velocity, not quality."),
    ],
    history: [["scored", "May 28"], ["confirmed → closer", "May 28"], ["pushed", "May 29"], ["engaged — booked call", "Jun 5"]] },

  { id: "summit", name: "Summit Hydraulics & Seal", domain: "summithydraulics.com",
    vertical: "industrial_b2b", city: "Akron", state: "OH", hubspot_id: "HS-48251",
    discovered_by: "pagespeed", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    new_hire_role: "Marketing Manager", blog_quiet_year: "2024",
    contact: { first: "Mark", name: "Mark Petrarca", title: "VP Sales", email: "mpetrarca@summithydraulics.com" },
    signals: [
      sig("site_quality", "pagespeed", 43, "Mobile site scores 43/100 — Cumulative Layout Shift 0.34, no HTTPS redirect."),
      sig("hiring_marketing", "indeed", 0.6, "Posted “Marketing Manager” on Indeed 9 days ago — building the function now."),
    ],
    history: [["scored", "Jun 3"], ["confirmed → closer", "Jun 3"], ["pushed", "Jun 4"]] },

  { id: "cuyahoga", name: "Cuyahoga Precision Machining", domain: "cuyahogaprecision.com",
    vertical: "industrial_b2b", city: "Cleveland", state: "OH", hubspot_id: "HS-48260",
    discovered_by: "pagespeed", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    ad_creatives: 1, ad_competitor_creatives: 9, ad_since: "March",
    contact: { first: "Tom", name: "Tom Reilly", title: "President", email: "treilly@cuyahogaprecision.com" },
    signals: [
      sig("site_quality", "pagespeed", 37, "Mobile site scores 37/100 — site built 2014, not mobile-responsive below 768px."),
      sig("ads_stale", "public_signals", 8, "Running 1 ad creative since March pointing at the homepage; a competitor rotates 9 creatives to dedicated quote pages."),
      sig("seo_gap", "semrush", 0.65, "Invisible for “CNC machine shop cleveland” — page 4, ~22 ranked keywords."),
    ],
    history: [["scored", "Jun 4"], ["confirmed → closer", "Jun 4"], ["pushed", "Jun 5"]] },

  { id: "westlake", name: "Westlake Comfort Heating & Air", domain: "westlakecomfort.com",
    vertical: "home_services", city: "Westlake", state: "OH", hubspot_id: "HS-48274",
    discovered_by: "google_places", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    contact: { first: "Greg", name: "Greg Sandri", title: "General Manager", email: "greg@westlakecomfort.com" },
    signals: [
      sig("site_quality", "pagespeed", 49, "Mobile site scores 49/100 — slow first paint, contact form broken on iOS Safari."),
      sig("ads_active", "google_ads", 0.78, "Running Google Ads for “AC repair westlake” — paying for clicks that hit a slow page."),
    ],
    history: [["scored", "Jun 4"], ["confirmed → closer", "Jun 4"], ["pushed", "Jun 5"]] },

  { id: "halloran", name: "Halloran & Pierce LLP", domain: "halloranpierce.com",
    vertical: "legal", city: "Cleveland", state: "OH", hubspot_id: "HS-48288",
    discovered_by: "pagespeed", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    contact: { first: "Anne", name: "Anne Pierce", title: "Managing Partner", email: "apierce@halloranpierce.com" },
    signals: [
      sig("site_quality", "pagespeed", 58, "Mobile site scores 58/100 — heavy stock-photo carousel, 5.3s to interactive."),
      sig("ads_active", "google_ads", 0.82, "Running Google Ads on “personal injury lawyer cleveland” — high-cost clicks, weak landing page."),
    ],
    history: [["scored", "Jun 5"], ["confirmed → closer", "Jun 5"], ["pushed", "Jun 6"]] },

  { id: "rockyriver", name: "Rocky River Orthodontics", domain: "rockyriverortho.com",
    vertical: "healthcare", city: "Rocky River", state: "OH", hubspot_id: "HS-48295",
    discovered_by: "google_places", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    contact: { first: "Dr. Lena", name: "Dr. Lena Vasquez", title: "Owner / Orthodontist", email: "lena@rockyriverortho.com" },
    signals: [
      sig("site_quality", "pagespeed", 61, "Mobile site scores 61/100 — booking widget pushes layout, no click-to-call."),
      sig("ads_active", "google_ads", 0.75, "Running Google Ads for “invisalign rocky river” — active spend, no conversion tracking detected."),
    ],
    history: [["scored", "Jun 5"], ["confirmed → closer", "Jun 5"], ["pushed", "Jun 6"]] },

  { id: "greenline", name: "Greenline Lawn & Landscape", domain: "greenlinelawn.com",
    vertical: "home_services", city: "Medina", state: "OH", hubspot_id: "HS-48301",
    discovered_by: "pagespeed", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    contact: { first: "Cody", name: "Cody Brennan", title: "Owner", email: "cody@greenlinelawn.com" },
    signals: [
      sig("site_quality", "pagespeed", 52, "Mobile site scores 52/100 — no SSL on quote form, images unoptimized."),
      sig("hiring_marketing", "indeed", 0.55, "Posted “Marketing & Sales Coordinator” — growing past word-of-mouth."),
    ],
    history: [["scored", "Jun 5"], ["confirmed → closer", "Jun 5"], ["pushed", "Jun 6"]] },

  { id: "forgefield", name: "Forge & Field Outfitters", domain: "forgeandfield.com",
    vertical: "ecommerce", city: "Hudson", state: "OH", hubspot_id: "HS-48312",
    discovered_by: "pagespeed", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    contact: { first: "Sara", name: "Sara Lindqvist", title: "Founder", email: "sara@forgeandfield.com" },
    signals: [
      sig("site_quality", "pagespeed", 28, "Mobile site scores 28/100 — Shopify theme bloat, 7.2s load, 19% bounce-to-exit on PDP."),
    ],
    history: [["scored", "Jun 6"], ["confirmed → closer", "Jun 6"], ["pushed", "Jun 6"]] },

  { id: "medinavision", name: "Medina Vision Center", domain: "medinavision.com",
    vertical: "healthcare", city: "Medina", state: "OH", hubspot_id: "HS-48320",
    discovered_by: "pagespeed", stage: "pushed", confirmed: true, confirmed_route: "closer", confirmed_by: "auto · J. Sammon",
    contact: { first: "Priya", name: "Priya Nair", title: "Practice Administrator", email: "pnair@medinavision.com" },
    signals: [
      sig("site_quality", "pagespeed", 29, "Mobile site scores 29/100 — Flash-era layout, appointment page 404s on mobile."),
    ],
    history: [["scored", "Jun 6"], ["confirmed → closer", "Jun 6"], ["pushed", "Jun 6"]] },

  /* ---------- TRIAGE BATCH (scored Jun 8, awaiting confirmation) ---------- */
  { id: "avonlaw", name: "Avon Family Law Group", domain: "avonfamilylaw.com",
    vertical: "legal", city: "Avon", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Mike", name: "Mike Dolan", title: "Partner", email: "mdolan@avonfamilylaw.com" },
    signals: [
      sig("site_quality", "pagespeed", 39, "Mobile site scores 39/100 — no mobile nav, text overflows viewport."),
      sig("ads_active", "google_ads", 0.8, "Running Google Ads for “divorce attorney avon” — active budget."),
    ] },
  { id: "cantonsteel", name: "Canton Steel Fabricators", domain: "cantonsteelfab.com",
    vertical: "industrial_b2b", city: "Canton", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Bill", name: "Bill Hartman", title: "Owner", email: "bhartman@cantonsteelfab.com" },
    signals: [
      sig("site_quality", "pagespeed", 42, "Mobile site scores 42/100 — no HTTPS, 6s load on 4G."),
      sig("ads_active", "google_ads", 0.7, "Running Google Ads on “steel fabrication ohio”."),
      sig("seo_gap", "semrush", 0.6, "Page 5 for core terms; thin service pages."),
    ] },
  { id: "hudsonremodel", name: "Hudson Home Remodelers", domain: "hudsonremodelers.com",
    vertical: "home_services", city: "Hudson", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Jenna", name: "Jenna Schmidt", title: "Co-Owner", email: "jenna@hudsonremodelers.com" },
    signals: [
      sig("site_quality", "pagespeed", 46, "Mobile site scores 46/100 — gallery images uncompressed (12MB page)."),
      sig("ads_active", "google_ads", 0.76, "Running Google Ads for “kitchen remodel hudson ohio”."),
    ] },
  { id: "lakeeriedental", name: "Lake Erie Dental Studio", domain: "lakeeriedental.com",
    vertical: "healthcare", city: "Cleveland", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Dr. Omar", name: "Dr. Omar Haddad", title: "Owner", email: "omar@lakeeriedental.com" },
    signals: [
      sig("site_quality", "pagespeed", 71, "Mobile site scores 71/100 — decent, but slow booking flow."),
      sig("seo_gap", "semrush", 0.6, "Page 3 for “cosmetic dentist cleveland” — visibility gap vs competitors."),
    ] },
  { id: "geauga", name: "Geauga Industrial Coatings", domain: "geaugacoatings.com",
    vertical: "industrial_b2b", city: "Chardon", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Ron", name: "Ron Petty", title: "Sales Director", email: "rpetty@geaugacoatings.com" },
    signals: [
      sig("site_quality", "pagespeed", 68, "Mobile site scores 68/100 — okay speed, weak on conversion paths."),
      sig("seo_gap", "semrush", 0.62, "Almost no organic footprint for “industrial coating ohio”."),
    ] },
  { id: "solonwealth", name: "Solon Wealth Advisors", domain: "solonwealth.com",
    vertical: "legal", city: "Solon", state: "OH", discovered_by: "google_places", stage: "routed", batch: true,
    contact: { first: "Karen", name: "Karen Foltz", title: "Principal", email: "kfoltz@solonwealth.com" },
    signals: [
      sig("site_quality", "pagespeed", 77, "Mobile site scores 77/100 — site is fine, not the lever."),
      sig("hiring_marketing", "indeed", 0.55, "Posted “Marketing Coordinator” — building demand-gen now."),
    ],
    // human override example: rec closer (timing≥55) but ops kicks to nurture
    confirmed: true, confirmed_route: "nurture", confirmed_by: "J. Sammon",
    history: [["scored", "Jun 8"], ["override → nurture", "Jun 8 · J. Sammon — “site’s fine, let marketing warm them”"]] },
  { id: "tremont", name: "Tremont Kitchen & Bath", domain: "tremontkb.com",
    vertical: "home_services", city: "Cleveland", state: "OH", discovered_by: "google_places", stage: "routed", batch: true,
    contact: { first: "Luis", name: "Luis Moreno", title: "Owner", email: "luis@tremontkb.com" },
    signals: [ sig("site_quality", "pagespeed", 74, "Mobile site scores 74/100 — solid; no active buying signal yet.") ] },
  { id: "parmaauto", name: "Parma Auto Group", domain: "parmaautogroup.com",
    vertical: "ecommerce", city: "Parma", state: "OH", discovered_by: "google_places", stage: "routed", batch: true,
    contact: { first: "Nick", name: "Nick Russo", title: "GM", email: "nick@parmaautogroup.com" },
    signals: [ sig("site_quality", "pagespeed", 80, "Mobile site scores 80/100 — healthy site, no timing signal.") ] },
  { id: "mentoreye", name: "Mentor Eye Associates", domain: "mentoreye.com",
    vertical: "healthcare", city: "Mentor", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Dr. Paul", name: "Dr. Paul Eckert", title: "Owner", email: "peckert@mentoreye.com" },
    signals: [ sig("site_quality", "pagespeed", 84, "Mobile site scores 84/100 — good shape; nurture for later.") ] },
  { id: "erieshore", name: "Erie Shore Outfitters", domain: "erieshoreoutfitters.com",
    vertical: "ecommerce", city: "Sandusky", state: "OH", discovered_by: "pagespeed", stage: "routed", batch: true,
    contact: { first: "Maya", name: "Maya Brooks", title: "Founder", email: "maya@erieshoreoutfitters.com" },
    signals: [ sig("site_quality", "pagespeed", 88, "Mobile site scores 88/100 — strong; no current need.") ] },
  { id: "shorelinemarine", name: "Shoreline Marine Supply", domain: "shorelinemarine.com",
    vertical: "ecommerce", city: "Erie", state: "PA", discovered_by: "google_places", stage: "routed", batch: true,
    contact: { first: "Greg", name: "Greg Niemiec", title: "Owner", email: "greg@shorelinemarine.com" },
    signals: [ sig("site_quality", "pagespeed", 83, "Mobile site scores 83/100 — fine site.") ],
    // override to reject: out of NE-OH footprint
    confirmed: true, confirmed_route: "reject", confirmed_by: "J. Sammon",
    history: [["scored", "Jun 8"], ["override → reject", "Jun 8 · J. Sammon — “Erie PA, outside our footprint”"]] },
];

const ACCOUNTS = RAW.map(mk);
const byId = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a]));

/* ---- queue: confirmed-closer, in a sequence, sorted by score desc ---- */
const QUEUE = ACCOUNTS
  .filter((a) => a.route.effective === "closer" && (a.stage === "pushed" || a.stage === "engaged"))
  .sort((a, b) => b.score.total - a.score.total);

/* ---- triage: the latest scored batch ---- */
const BATCH = ACCOUNTS.filter((a) => a.batch);

/* ============================================================
   SCOREBOARD — attribution rows (closed-won) + pipeline funnel
   ============================================================ */
const WON = [
  { account_domain: "lakeshoretool.com", name: "Lakeshore Tool & Stamping", vertical: "industrial_b2b",
    machine_sourced: true, discovered_by: "pagespeed", tier: "Silver", service_fee_monthly: 1500,
    first_touch_at: "Mar 12, 2026", signed_at: "Apr 18, 2026" },
  { account_domain: "buckeyebasements.com", name: "Buckeye Basement Solutions", vertical: "home_services",
    machine_sourced: true, discovered_by: "pagespeed", tier: "Gold", service_fee_monthly: 2000,
    first_touch_at: "Mar 20, 2026", signed_at: "May 2, 2026" },
  { account_domain: "westlakecomfort.com", name: "Westlake Comfort Heating & Air", vertical: "home_services",
    machine_sourced: true, discovered_by: "google_places", tier: "Silver", service_fee_monthly: 1500,
    first_touch_at: "Apr 1, 2026", signed_at: "May 15, 2026" },
  { account_domain: "halloranpierce.com", name: "Halloran & Pierce LLP", vertical: "legal",
    machine_sourced: true, discovered_by: "pagespeed", tier: "Bronze", service_fee_monthly: 875,
    first_touch_at: "Apr 9, 2026", signed_at: "May 22, 2026" },
  { account_domain: "cuyahogaprecision.com", name: "Cuyahoga Precision Machining", vertical: "industrial_b2b",
    machine_sourced: true, discovered_by: "pagespeed", tier: "Silver", service_fee_monthly: 1500,
    first_touch_at: "Apr 22, 2026", signed_at: "Jun 1, 2026" },
  { account_domain: "riversidepeds.com", name: "Riverside Pediatrics", vertical: "healthcare",
    machine_sourced: false, discovered_by: "referral", tier: "Silver", service_fee_monthly: 1500,
    first_touch_at: "Apr 2, 2026", signed_at: "May 10, 2026" },
].map(owedLine);

const TOTAL_OWED = WON.filter((w) => w.qualifying).reduce((s, w) => s + w.twelve_mo_rev_share, 0);

/* pipeline funnel by stage (machine-sourced book) */
const FUNNEL = [
  { stage: "Discovered", count: 412 },
  { stage: "Scored", count: 412 },
  { stage: "Confirmed → Closer", count: 96 },
  { stage: "Engaged", count: 31 },
  { stage: "Opportunity", count: 14 },
  { stage: "Closed-won", count: 6 },
];

/* source attribution → revenue */
function sourceRollup() {
  const m = {};
  for (const w of WON) {
    const k = w.discovered_by;
    m[k] = m[k] || { source: k, clients: 0, qualifying: 0, revshare: 0 };
    m[k].clients++;
    if (w.qualifying) { m[k].qualifying++; m[k].revshare += w.twelve_mo_rev_share; }
  }
  return Object.values(m).sort((a, b) => b.revshare - a.revshare);
}

/* heat tier for a 0-100 score (mirrors ScoreMeter.tierFor) */
function tierFor(score) {
  if (score >= 90) return { key: "hot", label: "Hot", tone: "hot", color: "var(--heat-hot)" };
  if (score >= 70) return { key: "warm", label: "Warm", tone: "warm", color: "var(--heat-warm)" };
  if (score >= 50) return { key: "medium", label: "Medium", tone: "medium", color: "var(--heat-medium)" };
  if (score >= 25) return { key: "cool", label: "Cool", tone: "cool", color: "var(--heat-cool)" };
  return { key: "cold", label: "Cold", tone: "cold", color: "var(--heat-cold)" };
}
const bandTone = { A: "hot", B: "warm", C: "medium", R: "cool" };
const bandColor = { A: "var(--heat-hot)", B: "var(--heat-warm)", C: "var(--heat-medium)", R: "var(--heat-cool)" };
const routeTone = { closer: "coral", nurture: "cool", hold: "neutral", reject: "neutral" };

const fmtMoney = (n) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

Object.assign(window.PE, {
  Vertical, SignalKind, SourceLabel, RouteLabel,
  ACCOUNTS, byId, QUEUE, BATCH, WON, TOTAL_OWED, FUNNEL, sourceRollup,
  computeScore, recommendRoute, draftOutreach, owedLine, selectOffer, painQualified,
  tierFor, bandTone, bandColor, routeTone, fmtMoney,
  REV_SHARE_RATE, TAIL_MONTHS, MONTHLY_FLOOR, IN_MARKET_TIMING, VIABLE_FIT,
  closer: { name: "Ray Tomczak", title: "Account Executive", email: "ray@sixthcitymarketing.com" },
  ops: { name: "John Sammon", title: "Owner / Sixth City", email: "john@sixthcitymarketing.com" },
  today: "Monday, June 8",
});
