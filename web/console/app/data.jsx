/* ============================================================
   Ingestion Engine — LIVE data layer.
   Wires the designed UI to the deployed engine API:
     GET  /api/candidates  -> the ranked triage stream
     POST /api/ingest      -> run a CSV through the machine
   Static descriptive bits (stages copy, source registry, heat
   scale) stay local; RUN + STREAM are populated from the API.
   ============================================================ */

/* canonical 10 verticals (engine/models.py Vertical) -> display labels */
const Vertical = {
  industrial_manufacturing: "Industrial & Mfg",
  real_estate: "Real Estate",
  education: "Education",
  professional_b2b: "Professional & B2B",
  healthcare: "Healthcare",
  automotive: "Automotive",
  legal: "Legal",
  home_construction: "Home & Construction",
  retail_ecommerce: "Retail & Ecommerce",
  unknown: "Other / Unknown",
};

/* signal kinds -> short chip labels (engine/models.py SignalKind) */
const SignalKind = {
  site_quality: "Site quality",
  ai_citation_gap: "AI answer gap",
  ads_active: "Ads active",
  ads_stale: "Stale ads",
  keyword_gap: "Keyword gap",
  seo_gap: "Organic gap",
  backlink_gap: "Backlink gap",
  content_gap: "Content gap",
  local_seo_gap: "Local SEO",
  review_velocity: "Review velocity",
  hiring_marketing: "Hiring mktg",
  new_location: "New location",
};

const STATUS = {
  wired:    { label: "Wired",       tone: "green",   key: "wired" },
  testing:  { label: "Testing",     tone: "warning", key: "testing" },
  evaluate: { label: "To evaluate", tone: "neutral", key: "evaluate" },
};
const ROLE = {
  funnel: "Primary funnel", fallback: "Fallback", signal: "Signal",
  trigger: "Trigger", record: "System of record",
};

const ACTIVE_SOURCES = [
  { id: "clay", name: "Clay", icon: "Sparkles", role: "funnel", status: "wired",
    provides: "Domain + LinkedIn + industry", accounts: null, signals: null, lastSync: "live",
    note: "The funnel. Discovery + free enrichment happen here; the engine ingests the CSV export — no API calls, no token tax." },
  { id: "pagespeed", name: "In-house PageSpeed", icon: "Gauge", role: "fallback", status: "wired",
    provides: "Mobile performance score", accounts: null, signals: null, lastSync: "on deck",
    note: "Free site-quality gate. Runs as a batched pass over ingested domains (rate-limited), lifting bad-site firms on timing." },
  { id: "hubspot", name: "HubSpot", icon: "Briefcase", role: "record", status: "wired",
    provides: "Book of record + net-new gate", accounts: null, signals: null, lastSync: "live",
    note: "Dedupe target (batched domain search) + the machine-sourced scoreboard. Net-new only ever reaches the queue." },
];
const ONDECK_SOURCES = [
  { id: "adyntel", name: "Adyntel (ads active)", icon: "Activity", role: "signal", status: "evaluate",
    provides: "Already-running-ads check", note: "The 2nd agreeing signal — already spending = budget exists = warmer. Paid API, not yet wired." },
  { id: "seo_gap", name: "SEO gap (SEMrush)", icon: "Search", role: "signal", status: "evaluate",
    provides: "Organic visibility & keyword gaps", note: "Low visibility on high-intent terms = SEO need. Evaluate ROI before wiring." },
  { id: "public_signals", name: "Public-signal moat", icon: "ShieldCheck", role: "signal", status: "evaluate",
    provides: "AI-citation gap · stale ads · reviews", note: "The Blueprint moat — the 'why now' competitors can't see. Scrapers not built yet." },
];

/* heat color for a PageSpeed score — LOW score = HOT opportunity for us */
function siteHeat(score) {
  if (score < 35) return { tone: "hot", color: "var(--heat-hot)", label: "Critical" };
  if (score < 50) return { tone: "warm", color: "var(--heat-warm)", label: "Poor" };
  if (score < 70) return { tone: "medium", color: "var(--heat-medium)", label: "Weak" };
  if (score < 85) return { tone: "cool", color: "var(--heat-cool)", label: "Fair" };
  return { tone: "cold", color: "var(--heat-cold)", label: "Healthy" };
}

const srcLabel = { clay: "Clay", pagespeed: "PageSpeed fallback" };
const srcIcon = { clay: "Sparkles", pagespeed: "Gauge" };

window.PE = window.PE || {};

/* live state — populated by refresh() */
const RUN = { id: "live", label: "Live", ranAt: "—", ingested: null, netNew: null, merged: 0, signals: null, scored: null };
const STREAM = [];
// Order mirrors the engine: dedupe net-new SECOND (right after ingest) so the
// expensive enrichment only ever touches firms not already in the HubSpot book
// (enrich.py checks HubSpot first; in-book rows are skipped before any fetch).
const STAGES = [
  { key: "discover", icon: "Database", label: "List ingested",  value: null, sub: "pulled into the engine",  meta: "CSV ignition" },
  { key: "dedupe",   icon: "GitMerge", label: "Net-new",        value: null, sub: "not in your HubSpot book", meta: "dedupe · domain key" },
  { key: "enrich",   icon: "Gauge",    label: "Site quality",   value: null, sub: "net-new only (free)",      meta: "batched pass" },
  { key: "signals",  icon: "Layers",   label: "Signals",        value: null, sub: "net-new only",             meta: "site + moat" },
  { key: "ready",    icon: "Cpu",      label: "Ready to score", value: null, sub: "ranked for triage",        meta: "→ Triage Board" },
];

function mapCandidate(c) {
  const kinds = (c.signals || []).map((s) => s.kind);
  const siteSig = (c.signals || []).find((s) => s.kind === "site_quality");
  return {
    id: c.domain, name: c.name || c.domain, domain: c.domain,
    vertical: c.vertical, city: c.city || "", state: "",
    src: siteSig && siteSig.source === "pagespeed" ? "pagespeed" : "clay",
    site: siteSig ? Math.round(siteSig.value) : null,
    dedupe: c.net_new === true ? "net_new" : (c.net_new === false ? "merged" : "pending"), signalKinds: kinds,
    route: c.route, band: c.band, total: c.total, fit: c.fit, timing: c.timing,
  };
}

function rebuildStages(R) {
  // Dedupe is stage 2 and runs AT UPLOAD (row dedupe by domain + HubSpot CRM check),
  // so Net-new is a real number the moment a list lands. Site quality + Signals come
  // from the deferred free-enrichment pass over net-new only — show "—" (null) until
  // it runs, so a fresh upload never reads as "0 signals / 0 site quality".
  const enrichRan = (R.enriched || 0) > 0;
  const inBookSub = R.inBook ? (R.inBook.toLocaleString("en-US") + " already in book — skipped") : "not in your HubSpot book";
  window.PE.STAGES = [
    { key: "discover", icon: "Database", label: "List ingested",  value: R.ingested,                   sub: "pulled into the engine", meta: "CSV ignition" },
    { key: "dedupe",   icon: "GitMerge", label: "Net-new",        value: R.netNew,                     sub: inBookSub,                meta: "row + HubSpot" },
    { key: "enrich",   icon: "Gauge",    label: "Site quality",   value: enrichRan ? R.netNew : null,  sub: enrichRan ? "net-new only (free)" : "run enrichment", meta: "PageSpeed · paced" },
    { key: "signals",  icon: "Layers",   label: "Signals",        value: enrichRan ? R.signals : null, sub: enrichRan ? "net-new only" : "run enrichment", meta: "site + moat" },
    { key: "ready",    icon: "Cpu",      label: "Ready to score", value: R.netNew,                     sub: "ranked for triage",      meta: "→ Triage Board" },
  ];
}

async function refresh() {
  let stream = [];
  let total = 0;
  let j = {};   // hoisted: read below (j.counts) outside the try; a const here would ReferenceError and reject refresh()
  try {
    const r = await fetch("/api/candidates");
    j = await r.json();
    stream = (j.candidates || []).map(mapCandidate);
    total = j.count != null ? j.count : stream.length;
  } catch (e) { /* leave empty on failure */ }
  const li = window.PE.LAST_INGEST || {};
  const R = Object.assign({}, window.PE.RUN, {
    netNew: (j.counts && j.counts.net_new != null) ? j.counts.net_new : total,
    inBook: j.counts ? j.counts.in_book : 0,
    pending: j.counts ? j.counts.pending : 0,
    enriched: j.counts ? (j.counts.enriched || 0) : 0,
    ingested: li.ingested != null ? li.ingested : total,
    signals: stream.reduce((a, s) => a + s.signalKinds.length, 0),
    scored: li.scored != null ? li.scored : total,
    merged: li.dropped_not_net_new || 0,
    ranAt: new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  });
  window.PE.STREAM = stream;
  window.PE.RUN = R;
  rebuildStages(R);
  return R;
}

async function enrichChunk(limit = 20) {
  const r = await fetch("/api/enrich?limit=" + limit, { method: "POST" });
  return r.json();   // { enriched, remaining }
}

async function ingestFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/ingest", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || ("Ingest failed (" + r.status + ")"));
  window.PE.LAST_INGEST = j;
  return j;
}

Object.assign(window.PE, {
  Vertical, SignalKind, RUN, STAGES, STATUS, ROLE,
  ACTIVE_SOURCES, ONDECK_SOURCES, STREAM,
  siteHeat, srcLabel, srcIcon, refresh, ingestFile, enrichChunk, LAST_INGEST: null,
  ops: { name: "John Sammon", title: "Owner / Sixth City" },
  danny: { name: "Danny Cox", title: "Pipeline Ops" },
});
