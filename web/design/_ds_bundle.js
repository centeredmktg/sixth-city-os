/* @ds-bundle: {"format":3,"namespace":"Ds360GrowthDesignSystem_39b0a1","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"AvatarGroup","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"ProgressBar","sourcePath":"components/display/ProgressBar.jsx"},{"name":"ScoreRing","sourcePath":"components/display/ScoreRing.jsx"},{"name":"Stat","sourcePath":"components/display/Stat.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"ToastViewport","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"RatingScale","sourcePath":"components/forms/RatingScale.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"app/accounts.jsx":"b50867b83ce0","app/app.jsx":"8e49018fbf82","app/data.jsx":"63a05276218c","app/detail.jsx":"2f6485805b1f","app/icons.jsx":"0804f6b1b057","app/queue.jsx":"60e36859df12","app/scoreboard.jsx":"c18a87da0cca","app/shell.jsx":"44d3c5b35318","app/triage.jsx":"e3bfda7e60ee","components/brand/Logo.jsx":"9c0d3bb218cb","components/display/Avatar.jsx":"7c12f206cda4","components/display/Badge.jsx":"1a364b33214c","components/display/Card.jsx":"59292b78b8b6","components/display/ProgressBar.jsx":"a39069bb4c09","components/display/ScoreRing.jsx":"7807d0965cb7","components/display/Stat.jsx":"2f43a8a74981","components/display/Tag.jsx":"1d4e12e98161","components/feedback/Dialog.jsx":"94d0fc826e50","components/feedback/Toast.jsx":"8f06cf3ac3e4","components/feedback/Tooltip.jsx":"0b09c72b027b","components/forms/Button.jsx":"6aa30ddf5b6c","components/forms/Checkbox.jsx":"ff945fc84e7e","components/forms/IconButton.jsx":"75f35bf50986","components/forms/Input.jsx":"0ff8d37c542e","components/forms/Radio.jsx":"50d5e92230b9","components/forms/RatingScale.jsx":"f415ededceb8","components/forms/Select.jsx":"60924546a370","components/forms/Switch.jsx":"6841caae712f","components/forms/Textarea.jsx":"f13bbeea56fb","components/navigation/Tabs.jsx":"088091526522","ui_kits/app/AppScreens.jsx":"6d2bae749bce","ui_kits/app/AppShell.jsx":"5000bdc06e11","ui_kits/marketing/MarketingSite.jsx":"5a1a42cf6715"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Ds360GrowthDesignSystem_39b0a1 = window.Ds360GrowthDesignSystem_39b0a1 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// app/accounts.jsx
try { (() => {
/* ============================================================
   Accounts — directory table (the home for Account Detail)
   Every account the engine is tracking, filterable, click → detail.
   ============================================================ */
const {
  useState: useStateA
} = React;
const PEA = window.PE;
const {
  Badge: BadgeA
} = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoA = PEA.Icons;
const AC_CSS = `
.ac-tabs{ display:flex; gap:8px; margin-bottom:16px; }
.ac-table{ width:100%; border-collapse:collapse; background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-sm); }
.ac-table thead th{ text-align:left; font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em;
  font-size:11px; font-weight:700; color:var(--text-subtle); padding:13px 16px; border-bottom:1px solid var(--border-default);
  background:var(--stone-50); white-space:nowrap; }
.ac-table thead th.r{ text-align:right; }
.ac-table tbody td{ padding:13px 16px; border-bottom:1px solid var(--border-subtle); font-size:var(--text-sm); vertical-align:middle; }
.ac-table tbody tr{ cursor:pointer; transition:background var(--tap-transition); }
.ac-table tbody tr:hover{ background:var(--surface-hover); }
.ac-table tbody tr:last-child td{ border-bottom:none; }
.ac-band{ display:inline-grid; place-items:center; width:30px; height:30px; border-radius:var(--radius-sm);
  font-family:var(--font-condensed); font-weight:800; font-size:17px; color:#fff; }
.ac-name{ font-weight:800; color:var(--text-strong); }
.ac-name__d{ font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); font-weight:400; }
.ac-num{ font-family:var(--font-mono); font-weight:600; color:var(--text-body); text-align:right; }
.ac-chev{ color:var(--text-subtle); }
`;
(function () {
  if (document.getElementById("pe-ac-css")) return;
  const s = document.createElement("style");
  s.id = "pe-ac-css";
  s.textContent = AC_CSS;
  document.head.appendChild(s);
})();
const STAGE_TONE = {
  discovered: "neutral",
  scored: "neutral",
  routed: "info",
  pushed: "coral",
  engaged: "green",
  opportunity: "warning",
  closed_won: "green",
  closed_lost: "neutral"
};
function Accounts({
  onOpen
}) {
  const [tab, setTab] = useStateA("all");
  const tabs = [{
    id: "all",
    label: "All"
  }, {
    id: "closer",
    label: "Closer queue"
  }, {
    id: "routed",
    label: "Awaiting triage"
  }, {
    id: "nurture",
    label: "Nurture"
  }];
  const list = PEA.ACCOUNTS.filter(a => {
    if (tab === "all") return true;
    if (tab === "routed") return a.stage === "routed" && !a.route.confirmed;
    return a.route.effective === tab;
  }).sort((a, b) => b.score.total - a.score.total);
  return /*#__PURE__*/React.createElement("div", {
    className: "pe-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-head",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pe-overline",
    style: {
      color: "var(--coral-600)"
    }
  }, "Directory"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "6px 0 0"
    }
  }, "Accounts"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-muted)"
    }
  }, "Every net-new account the engine is tracking. Click any row for the full evidence trail."))), /*#__PURE__*/React.createElement("div", {
    className: "ac-tabs"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    className: "q-chip" + (tab === t.id ? " q-chip--on" : ""),
    onClick: () => setTab(t.id)
  }, t.label, " ", /*#__PURE__*/React.createElement("span", {
    className: "q-chip__c"
  }, PEA.ACCOUNTS.filter(a => t.id === "all" ? true : t.id === "routed" ? a.stage === "routed" && !a.route.confirmed : a.route.effective === t.id).length)))), /*#__PURE__*/React.createElement("table", {
    className: "ac-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Band"), /*#__PURE__*/React.createElement("th", null, "Account"), /*#__PURE__*/React.createElement("th", null, "Vertical"), /*#__PURE__*/React.createElement("th", null, "Location"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "Fit"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "Timing"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "Score"), /*#__PURE__*/React.createElement("th", null, "Route"), /*#__PURE__*/React.createElement("th", null, "Stage"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, list.map(a => /*#__PURE__*/React.createElement("tr", {
    key: a.id,
    onClick: () => onOpen(a.id)
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "ac-band",
    style: {
      background: PEA.bandColor[a.score.band]
    }
  }, a.score.band)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "ac-name"
  }, a.name), /*#__PURE__*/React.createElement("div", {
    className: "ac-name__d"
  }, a.domain)), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, PEA.Vertical[a.vertical]), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--text-muted)"
    }
  }, a.city, ", ", a.state), /*#__PURE__*/React.createElement("td", {
    className: "ac-num"
  }, a.score.fit), /*#__PURE__*/React.createElement("td", {
    className: "ac-num",
    style: {
      color: a.score.timing >= PEA.IN_MARKET_TIMING ? "var(--coral-600)" : "var(--text-body)"
    }
  }, a.score.timing), /*#__PURE__*/React.createElement("td", {
    className: "ac-num",
    style: {
      fontWeight: 700,
      color: PEA.bandColor[a.score.band]
    }
  }, a.score.total), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(BadgeA, {
    tone: PEA.routeTone[a.route.effective],
    size: "sm"
  }, PEA.RouteLabel[a.route.effective])), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(BadgeA, {
    tone: STAGE_TONE[a.stage],
    variant: "soft",
    size: "sm",
    dot: true
  }, a.stage.replace("_", "-"))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(IcoA.ChevronRight, {
    size: 16,
    className: "ac-chev"
  })))))));
}
window.PE.Accounts = Accounts;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/accounts.jsx", error: String((e && e.message) || e) }); }

// app/app.jsx
try { (() => {
/* ============================================================
   Pipeline Engine — root app (nav state, screen router, toast)
   ============================================================ */
const {
  useState: useStateApp,
  useEffect: useEffectApp
} = React;
const P = window.PE;
const APP_CSS = `
.pe-toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px);
  background:var(--ink-900); color:#fff; padding:12px 18px; border-radius:var(--radius-md); box-shadow:var(--shadow-lg);
  display:flex; align-items:center; gap:11px; font-weight:700; font-size:var(--text-sm); z-index:50;
  opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; }
.pe-toast--on{ opacity:1; transform:translateX(-50%) translateY(0); }
.pe-toast svg{ color:var(--green-400); }
.pe-toast b{ color:var(--orange-400); }
`;
(function () {
  if (document.getElementById("pe-app-css")) return;
  const s = document.createElement("style");
  s.id = "pe-app-css";
  s.textContent = APP_CSS;
  document.head.appendChild(s);
})();
const TITLES = {
  queue: {
    title: "Morning Queue",
    sub: "Your prioritized accounts to work today"
  },
  triage: {
    title: "Triage Board",
    sub: "Confirm or override routing — the human-in-the-loop gate"
  },
  scoreboard: {
    title: "Scoreboard",
    sub: "Attribution & rev-share — audit any time"
  },
  accounts: {
    title: "Accounts",
    sub: "Directory of every tracked account"
  },
  detail: {
    title: "Account",
    sub: "Full evidence trail"
  }
};
function App() {
  const [view, setView] = useStateApp("queue");
  const [acctId, setAcctId] = useStateApp(null);
  const [prev, setPrev] = useStateApp("queue");
  const [toast, setToast] = useStateApp(null);
  useEffectApp(() => {
    document.querySelector(".pe-scroll")?.scrollTo(0, 0);
  }, [view, acctId]);
  useEffectApp(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const open = id => {
    setPrev(view === "detail" ? prev : view);
    setAcctId(id);
    setView("detail");
  };
  const nav = v => {
    setView(v);
    if (v !== "detail") setAcctId(null);
  };
  const action = (kind, a) => {
    const msg = {
      call: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, a.name), " opened in HubSpot \u2014 call logged when you dial"),
      touch: /*#__PURE__*/React.createElement("span", null, "Touch logged on ", /*#__PURE__*/React.createElement("b", null, a.name)),
      nurture: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, a.name), " kicked back to nurture \u2014 marketing takes it from here")
    }[kind];
    setToast({
      msg
    });
  };
  const counts = {
    queue: P.QUEUE.length,
    triage: P.BATCH.filter(a => !a.route.confirmed).length
  };
  let screen;
  if (view === "queue") screen = /*#__PURE__*/React.createElement(P.MorningQueue, {
    onOpen: open,
    onAction: action
  });else if (view === "triage") screen = /*#__PURE__*/React.createElement(P.TriageBoard, {
    onOpen: open
  });else if (view === "scoreboard") screen = /*#__PURE__*/React.createElement(P.Scoreboard, {
    onOpen: open
  });else if (view === "accounts") screen = /*#__PURE__*/React.createElement(P.Accounts, {
    onOpen: open
  });else if (view === "detail") screen = /*#__PURE__*/React.createElement(P.AccountDetail, {
    id: acctId,
    onBack: () => nav(prev)
  });
  const meta = view === "detail" ? TITLES.detail : TITLES[view];
  const right = view === "triage" ? /*#__PURE__*/React.createElement(P.Badge, {
    tone: "coral",
    variant: "soft",
    dot: true
  }, counts.triage, " awaiting confirmation") : view === "queue" ? /*#__PURE__*/React.createElement(P.Badge, {
    tone: "green",
    variant: "soft",
    dot: true
  }, P.QUEUE.filter(a => a.stage === "engaged").length, " live conversations") : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "pe-app"
  }, /*#__PURE__*/React.createElement(P.Sidebar, {
    view: view,
    onNav: nav,
    counts: counts
  }), /*#__PURE__*/React.createElement("div", {
    className: "pe-main"
  }, /*#__PURE__*/React.createElement(P.Topbar, {
    title: meta.title,
    sub: meta.sub,
    right: right
  }), /*#__PURE__*/React.createElement("div", {
    className: "pe-scroll"
  }, screen)), /*#__PURE__*/React.createElement("div", {
    className: "pe-toast" + (toast ? " pe-toast--on" : "")
  }, toast && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(P.Icons.CheckCheck, {
    size: 17
  }), toast.msg)));
}

// Badge passthrough for app-level use
window.PE.Badge = window.SixthCityMarketingDesignSystem_4d5a9e.Badge;
ReactDOM.createRoot(document.getElementById("pe-root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/app.jsx", error: String((e && e.message) || e) }); }

// app/data.jsx
try { (() => {
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
  unknown: "Unknown"
};
const SignalKind = {
  site_quality: "Site Quality",
  seo_gap: "SEO Gap",
  ads_active: "Ads Active",
  hiring_marketing: "Hiring Marketing",
  new_location: "New Location",
  review_velocity: "Review Velocity"
};
const SourceLabel = {
  pagespeed: "PageSpeed / Lighthouse",
  google_places: "Google Places",
  google_ads: "Ads Transparency",
  indeed: "Job Boards",
  semrush: "SEMrush",
  referral: "Referral (manual)"
};
const RouteLabel = {
  closer: "Closer",
  nurture: "Nurture",
  hold: "Hold",
  reject: "Reject"
};

/* ---- Scoring (engine/scoring/abcr.py) ---- */
const FIT_WEIGHT = 0.4,
  TIMING_WEIGHT = 0.6;
function fitScore(state) {
  return Math.min(state === "OH" ? 70 + 15 : 70, 100);
}
function timingScore(signals) {
  if (!signals.length) return 0;
  let p = 0;
  for (const s of signals) {
    if (s.kind === "site_quality") p += (100 - s.value) * 0.8;else if (s.kind === "ads_active") p += 60;else if (s.kind === "seo_gap") p += 40;else if (s.kind === "hiring_marketing") p += 50;else p += s.value * 0.3;
  }
  return Math.min(p, 100);
}
function band(total) {
  return total >= 75 ? "A" : total >= 55 ? "B" : total >= 35 ? "C" : "R";
}
function computeScore(acct) {
  const fit = fitScore(acct.state);
  const timing = timingScore(acct.signals);
  const total = fit * FIT_WEIGHT + timing * TIMING_WEIGHT;
  return {
    fit: Math.round(fit * 10) / 10,
    timing: Math.round(timing * 10) / 10,
    total: Math.round(total * 10) / 10,
    band: band(total),
    rationale: `fit ${fit.toFixed(0)} × ${FIT_WEIGHT} + timing ${timing.toFixed(0)} × ${TIMING_WEIGHT}`
  };
}

/* ---- Routing (engine/routing.py) ---- */
const IN_MARKET_TIMING = 55.0,
  VIABLE_FIT = 60.0;
function recommendRoute(score) {
  if (!score) return {
    recommended: "hold",
    rationale: "unscored"
  };
  if (score.timing >= IN_MARKET_TIMING) return {
    recommended: "closer",
    rationale: `in-market now (timing ${score.timing.toFixed(0)} ≥ ${IN_MARKET_TIMING.toFixed(0)})`
  };
  if (score.fit >= VIABLE_FIT) return {
    recommended: "nurture",
    rationale: `good fit (${score.fit.toFixed(0)}) but cold (timing ${score.timing.toFixed(0)}) — marketing nurtures`
  };
  if (score.fit >= VIABLE_FIT * 0.6) return {
    recommended: "hold",
    rationale: "marginal on both axes — revisit later"
  };
  return {
    recommended: "reject",
    rationale: "not a fit"
  };
}

/* ---- Rev-share (engine/attribution/dashboard.py) ---- */
const REV_SHARE_RATE = 0.05,
  TAIL_MONTHS = 12,
  MONTHLY_FLOOR = 500.0;
function qualifies(a) {
  return a.machine_sourced && !!a.signed_at;
} // net-new gate enforced upstream
function owedLine(a) {
  const q = qualifies(a);
  const tail = q ? a.service_fee_monthly * TAIL_MONTHS * REV_SHARE_RATE : 0;
  return {
    ...a,
    qualifying: q,
    twelve_mo_rev_share: Math.round(tail * 100) / 100,
    note: q ? "qualifying" : !a.machine_sourced ? "not machine-sourced" : "no signed date"
  };
}

/* ---- helper: build a signal ---- */
const sig = (kind, source, value, detail) => ({
  kind,
  source,
  value,
  detail
});

/* draft a templated outreach (mirrors modules/draft_cold_email.py) */
function urgency(s) {
  return s.kind === "site_quality" ? 100 - s.value : s.value;
}
function draftOutreach(acct) {
  const strongest = acct.signals.slice().sort((a, b) => urgency(b) - urgency(a))[0];
  const reason = strongest ? strongest.detail : "we noticed an opportunity on your site";
  return {
    account_domain: acct.domain,
    reason_signal: strongest ? strongest.kind : null,
    subject: `Quick note on ${acct.name.split(" ").slice(0, 2).join(" ")}'s website`,
    body: `Hi ${acct.contact ? acct.contact.first : "there"} — we ran ${acct.name} through our free website evaluation. ${reason}\n\nWe help ${Vertical[acct.vertical].toLowerCase()} businesses across Northeast Ohio turn that into more leads and booked revenue — not just traffic. Worth a quick 15-minute look at what we found?\n\n— ${"Centered / Sixth City Marketing"}`
  };
}

/* ============================================================
   ACCOUNTS — raw records (models.py field names)
   ============================================================ */
function mk(r) {
  const score = computeScore(r);
  const rec = recommendRoute(score);
  const route = {
    recommended: rec.recommended,
    rationale: rec.rationale,
    confirmed: r.confirmed ?? false,
    confirmed_route: r.confirmed_route ?? null,
    confirmed_by: r.confirmed_by ?? "",
    effective: r.confirmed && r.confirmed_route ? r.confirmed_route : rec.recommended,
    history: r.history ?? []
  };
  const a = {
    ...r,
    score,
    route
  };
  a.outreach = r.outreach ?? draftOutreach(a);
  return a;
}
const RAW = [/* ---------- CLOSER QUEUE (confirmed, in a sequence) ---------- */
{
  id: "lakeshore",
  name: "Lakeshore Tool & Stamping",
  domain: "lakeshoretool.com",
  vertical: "industrial_b2b",
  city: "Mentor",
  state: "OH",
  hubspot_id: "HS-48217",
  discovered_by: "pagespeed",
  stage: "engaged",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Dave",
    name: "Dave Kowalczyk",
    title: "Operations Manager",
    email: "dkowalczyk@lakeshoretool.com"
  },
  signals: [sig("site_quality", "pagespeed", 31, "Mobile site scores 31/100 on Google PageSpeed — LCP 6.8s, no mobile viewport tag."), sig("ads_active", "google_ads", 0.85, "Actively running Google Ads on “CNC machining Ohio” — budget already exists."), sig("seo_gap", "semrush", 0.7, "Ranks page 3+ for “precision stamping cleveland”; 18 organic keywords vs ~160 for top competitor.")],
  history: [["scored", "Jun 1"], ["routed → closer", "Jun 1"], ["confirmed", "Jun 1 · J. Sammon"], ["pushed to HubSpot", "Jun 2"], ["engaged — replied", "Jun 6"]]
}, {
  id: "buckeye",
  name: "Buckeye Basement Solutions",
  domain: "buckeyebasements.com",
  vertical: "home_services",
  city: "Strongsville",
  state: "OH",
  hubspot_id: "HS-48233",
  discovered_by: "pagespeed",
  stage: "engaged",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Renee",
    name: "Renee Adams",
    title: "Owner",
    email: "renee@buckeyebasements.com"
  },
  signals: [sig("site_quality", "pagespeed", 34, "Mobile site scores 34/100 — render-blocking scripts, 4.1MB hero image, no caching."), sig("ads_active", "google_ads", 0.8, "Running Local Services Ads for “basement waterproofing” — spending now.")],
  history: [["scored", "May 28"], ["confirmed → closer", "May 28"], ["pushed", "May 29"], ["engaged — booked call", "Jun 5"]]
}, {
  id: "summit",
  name: "Summit Hydraulics & Seal",
  domain: "summithydraulics.com",
  vertical: "industrial_b2b",
  city: "Akron",
  state: "OH",
  hubspot_id: "HS-48251",
  discovered_by: "pagespeed",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Mark",
    name: "Mark Petrarca",
    title: "VP Sales",
    email: "mpetrarca@summithydraulics.com"
  },
  signals: [sig("site_quality", "pagespeed", 43, "Mobile site scores 43/100 — Cumulative Layout Shift 0.34, no HTTPS redirect."), sig("hiring_marketing", "indeed", 0.6, "Posted “Marketing Manager” on Indeed 9 days ago — building the function now.")],
  history: [["scored", "Jun 3"], ["confirmed → closer", "Jun 3"], ["pushed", "Jun 4"]]
}, {
  id: "cuyahoga",
  name: "Cuyahoga Precision Machining",
  domain: "cuyahogaprecision.com",
  vertical: "industrial_b2b",
  city: "Cleveland",
  state: "OH",
  hubspot_id: "HS-48260",
  discovered_by: "pagespeed",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Tom",
    name: "Tom Reilly",
    title: "President",
    email: "treilly@cuyahogaprecision.com"
  },
  signals: [sig("site_quality", "pagespeed", 37, "Mobile site scores 37/100 — site built 2014, not mobile-responsive below 768px."), sig("seo_gap", "semrush", 0.65, "Invisible for “CNC machine shop cleveland” — page 4, ~22 ranked keywords.")],
  history: [["scored", "Jun 4"], ["confirmed → closer", "Jun 4"], ["pushed", "Jun 5"]]
}, {
  id: "westlake",
  name: "Westlake Comfort Heating & Air",
  domain: "westlakecomfort.com",
  vertical: "home_services",
  city: "Westlake",
  state: "OH",
  hubspot_id: "HS-48274",
  discovered_by: "google_places",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Greg",
    name: "Greg Sandri",
    title: "General Manager",
    email: "greg@westlakecomfort.com"
  },
  signals: [sig("site_quality", "pagespeed", 49, "Mobile site scores 49/100 — slow first paint, contact form broken on iOS Safari."), sig("ads_active", "google_ads", 0.78, "Running Google Ads for “AC repair westlake” — paying for clicks that hit a slow page.")],
  history: [["scored", "Jun 4"], ["confirmed → closer", "Jun 4"], ["pushed", "Jun 5"]]
}, {
  id: "halloran",
  name: "Halloran & Pierce LLP",
  domain: "halloranpierce.com",
  vertical: "legal",
  city: "Cleveland",
  state: "OH",
  hubspot_id: "HS-48288",
  discovered_by: "pagespeed",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Anne",
    name: "Anne Pierce",
    title: "Managing Partner",
    email: "apierce@halloranpierce.com"
  },
  signals: [sig("site_quality", "pagespeed", 58, "Mobile site scores 58/100 — heavy stock-photo carousel, 5.3s to interactive."), sig("ads_active", "google_ads", 0.82, "Running Google Ads on “personal injury lawyer cleveland” — high-cost clicks, weak landing page.")],
  history: [["scored", "Jun 5"], ["confirmed → closer", "Jun 5"], ["pushed", "Jun 6"]]
}, {
  id: "rockyriver",
  name: "Rocky River Orthodontics",
  domain: "rockyriverortho.com",
  vertical: "healthcare",
  city: "Rocky River",
  state: "OH",
  hubspot_id: "HS-48295",
  discovered_by: "google_places",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Dr. Lena",
    name: "Dr. Lena Vasquez",
    title: "Owner / Orthodontist",
    email: "lena@rockyriverortho.com"
  },
  signals: [sig("site_quality", "pagespeed", 61, "Mobile site scores 61/100 — booking widget pushes layout, no click-to-call."), sig("ads_active", "google_ads", 0.75, "Running Google Ads for “invisalign rocky river” — active spend, no conversion tracking detected.")],
  history: [["scored", "Jun 5"], ["confirmed → closer", "Jun 5"], ["pushed", "Jun 6"]]
}, {
  id: "greenline",
  name: "Greenline Lawn & Landscape",
  domain: "greenlinelawn.com",
  vertical: "home_services",
  city: "Medina",
  state: "OH",
  hubspot_id: "HS-48301",
  discovered_by: "pagespeed",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Cody",
    name: "Cody Brennan",
    title: "Owner",
    email: "cody@greenlinelawn.com"
  },
  signals: [sig("site_quality", "pagespeed", 52, "Mobile site scores 52/100 — no SSL on quote form, images unoptimized."), sig("hiring_marketing", "indeed", 0.55, "Posted “Marketing & Sales Coordinator” — growing past word-of-mouth.")],
  history: [["scored", "Jun 5"], ["confirmed → closer", "Jun 5"], ["pushed", "Jun 6"]]
}, {
  id: "forgefield",
  name: "Forge & Field Outfitters",
  domain: "forgeandfield.com",
  vertical: "ecommerce",
  city: "Hudson",
  state: "OH",
  hubspot_id: "HS-48312",
  discovered_by: "pagespeed",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Sara",
    name: "Sara Lindqvist",
    title: "Founder",
    email: "sara@forgeandfield.com"
  },
  signals: [sig("site_quality", "pagespeed", 28, "Mobile site scores 28/100 — Shopify theme bloat, 7.2s load, 19% bounce-to-exit on PDP.")],
  history: [["scored", "Jun 6"], ["confirmed → closer", "Jun 6"], ["pushed", "Jun 6"]]
}, {
  id: "medinavision",
  name: "Medina Vision Center",
  domain: "medinavision.com",
  vertical: "healthcare",
  city: "Medina",
  state: "OH",
  hubspot_id: "HS-48320",
  discovered_by: "pagespeed",
  stage: "pushed",
  confirmed: true,
  confirmed_route: "closer",
  confirmed_by: "auto · J. Sammon",
  contact: {
    first: "Priya",
    name: "Priya Nair",
    title: "Practice Administrator",
    email: "pnair@medinavision.com"
  },
  signals: [sig("site_quality", "pagespeed", 29, "Mobile site scores 29/100 — Flash-era layout, appointment page 404s on mobile.")],
  history: [["scored", "Jun 6"], ["confirmed → closer", "Jun 6"], ["pushed", "Jun 6"]]
}, /* ---------- TRIAGE BATCH (scored Jun 8, awaiting confirmation) ---------- */
{
  id: "avonlaw",
  name: "Avon Family Law Group",
  domain: "avonfamilylaw.com",
  vertical: "legal",
  city: "Avon",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Mike",
    name: "Mike Dolan",
    title: "Partner",
    email: "mdolan@avonfamilylaw.com"
  },
  signals: [sig("site_quality", "pagespeed", 39, "Mobile site scores 39/100 — no mobile nav, text overflows viewport."), sig("ads_active", "google_ads", 0.8, "Running Google Ads for “divorce attorney avon” — active budget.")]
}, {
  id: "cantonsteel",
  name: "Canton Steel Fabricators",
  domain: "cantonsteelfab.com",
  vertical: "industrial_b2b",
  city: "Canton",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Bill",
    name: "Bill Hartman",
    title: "Owner",
    email: "bhartman@cantonsteelfab.com"
  },
  signals: [sig("site_quality", "pagespeed", 42, "Mobile site scores 42/100 — no HTTPS, 6s load on 4G."), sig("ads_active", "google_ads", 0.7, "Running Google Ads on “steel fabrication ohio”."), sig("seo_gap", "semrush", 0.6, "Page 5 for core terms; thin service pages.")]
}, {
  id: "hudsonremodel",
  name: "Hudson Home Remodelers",
  domain: "hudsonremodelers.com",
  vertical: "home_services",
  city: "Hudson",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Jenna",
    name: "Jenna Schmidt",
    title: "Co-Owner",
    email: "jenna@hudsonremodelers.com"
  },
  signals: [sig("site_quality", "pagespeed", 46, "Mobile site scores 46/100 — gallery images uncompressed (12MB page)."), sig("ads_active", "google_ads", 0.76, "Running Google Ads for “kitchen remodel hudson ohio”.")]
}, {
  id: "lakeeriedental",
  name: "Lake Erie Dental Studio",
  domain: "lakeeriedental.com",
  vertical: "healthcare",
  city: "Cleveland",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Dr. Omar",
    name: "Dr. Omar Haddad",
    title: "Owner",
    email: "omar@lakeeriedental.com"
  },
  signals: [sig("site_quality", "pagespeed", 71, "Mobile site scores 71/100 — decent, but slow booking flow."), sig("seo_gap", "semrush", 0.6, "Page 3 for “cosmetic dentist cleveland” — visibility gap vs competitors.")]
}, {
  id: "geauga",
  name: "Geauga Industrial Coatings",
  domain: "geaugacoatings.com",
  vertical: "industrial_b2b",
  city: "Chardon",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Ron",
    name: "Ron Petty",
    title: "Sales Director",
    email: "rpetty@geaugacoatings.com"
  },
  signals: [sig("site_quality", "pagespeed", 68, "Mobile site scores 68/100 — okay speed, weak on conversion paths."), sig("seo_gap", "semrush", 0.62, "Almost no organic footprint for “industrial coating ohio”.")]
}, {
  id: "solonwealth",
  name: "Solon Wealth Advisors",
  domain: "solonwealth.com",
  vertical: "legal",
  city: "Solon",
  state: "OH",
  discovered_by: "google_places",
  stage: "routed",
  batch: true,
  contact: {
    first: "Karen",
    name: "Karen Foltz",
    title: "Principal",
    email: "kfoltz@solonwealth.com"
  },
  signals: [sig("site_quality", "pagespeed", 77, "Mobile site scores 77/100 — site is fine, not the lever."), sig("hiring_marketing", "indeed", 0.55, "Posted “Marketing Coordinator” — building demand-gen now.")],
  // human override example: rec closer (timing≥55) but ops kicks to nurture
  confirmed: true,
  confirmed_route: "nurture",
  confirmed_by: "J. Sammon",
  history: [["scored", "Jun 8"], ["override → nurture", "Jun 8 · J. Sammon — “site’s fine, let marketing warm them”"]]
}, {
  id: "tremont",
  name: "Tremont Kitchen & Bath",
  domain: "tremontkb.com",
  vertical: "home_services",
  city: "Cleveland",
  state: "OH",
  discovered_by: "google_places",
  stage: "routed",
  batch: true,
  contact: {
    first: "Luis",
    name: "Luis Moreno",
    title: "Owner",
    email: "luis@tremontkb.com"
  },
  signals: [sig("site_quality", "pagespeed", 74, "Mobile site scores 74/100 — solid; no active buying signal yet.")]
}, {
  id: "parmaauto",
  name: "Parma Auto Group",
  domain: "parmaautogroup.com",
  vertical: "ecommerce",
  city: "Parma",
  state: "OH",
  discovered_by: "google_places",
  stage: "routed",
  batch: true,
  contact: {
    first: "Nick",
    name: "Nick Russo",
    title: "GM",
    email: "nick@parmaautogroup.com"
  },
  signals: [sig("site_quality", "pagespeed", 80, "Mobile site scores 80/100 — healthy site, no timing signal.")]
}, {
  id: "mentoreye",
  name: "Mentor Eye Associates",
  domain: "mentoreye.com",
  vertical: "healthcare",
  city: "Mentor",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Dr. Paul",
    name: "Dr. Paul Eckert",
    title: "Owner",
    email: "peckert@mentoreye.com"
  },
  signals: [sig("site_quality", "pagespeed", 84, "Mobile site scores 84/100 — good shape; nurture for later.")]
}, {
  id: "erieshore",
  name: "Erie Shore Outfitters",
  domain: "erieshoreoutfitters.com",
  vertical: "ecommerce",
  city: "Sandusky",
  state: "OH",
  discovered_by: "pagespeed",
  stage: "routed",
  batch: true,
  contact: {
    first: "Maya",
    name: "Maya Brooks",
    title: "Founder",
    email: "maya@erieshoreoutfitters.com"
  },
  signals: [sig("site_quality", "pagespeed", 88, "Mobile site scores 88/100 — strong; no current need.")]
}, {
  id: "shorelinemarine",
  name: "Shoreline Marine Supply",
  domain: "shorelinemarine.com",
  vertical: "ecommerce",
  city: "Erie",
  state: "PA",
  discovered_by: "google_places",
  stage: "routed",
  batch: true,
  contact: {
    first: "Greg",
    name: "Greg Niemiec",
    title: "Owner",
    email: "greg@shorelinemarine.com"
  },
  signals: [sig("site_quality", "pagespeed", 83, "Mobile site scores 83/100 — fine site.")],
  // override to reject: out of NE-OH footprint
  confirmed: true,
  confirmed_route: "reject",
  confirmed_by: "J. Sammon",
  history: [["scored", "Jun 8"], ["override → reject", "Jun 8 · J. Sammon — “Erie PA, outside our footprint”"]]
}];
const ACCOUNTS = RAW.map(mk);
const byId = Object.fromEntries(ACCOUNTS.map(a => [a.id, a]));

/* ---- queue: confirmed-closer, in a sequence, sorted by score desc ---- */
const QUEUE = ACCOUNTS.filter(a => a.route.effective === "closer" && (a.stage === "pushed" || a.stage === "engaged")).sort((a, b) => b.score.total - a.score.total);

/* ---- triage: the latest scored batch ---- */
const BATCH = ACCOUNTS.filter(a => a.batch);

/* ============================================================
   SCOREBOARD — attribution rows (closed-won) + pipeline funnel
   ============================================================ */
const WON = [{
  account_domain: "lakeshoretool.com",
  name: "Lakeshore Tool & Stamping",
  vertical: "industrial_b2b",
  machine_sourced: true,
  discovered_by: "pagespeed",
  tier: "Silver",
  service_fee_monthly: 1500,
  first_touch_at: "Mar 12, 2026",
  signed_at: "Apr 18, 2026"
}, {
  account_domain: "buckeyebasements.com",
  name: "Buckeye Basement Solutions",
  vertical: "home_services",
  machine_sourced: true,
  discovered_by: "pagespeed",
  tier: "Gold",
  service_fee_monthly: 2000,
  first_touch_at: "Mar 20, 2026",
  signed_at: "May 2, 2026"
}, {
  account_domain: "westlakecomfort.com",
  name: "Westlake Comfort Heating & Air",
  vertical: "home_services",
  machine_sourced: true,
  discovered_by: "google_places",
  tier: "Silver",
  service_fee_monthly: 1500,
  first_touch_at: "Apr 1, 2026",
  signed_at: "May 15, 2026"
}, {
  account_domain: "halloranpierce.com",
  name: "Halloran & Pierce LLP",
  vertical: "legal",
  machine_sourced: true,
  discovered_by: "pagespeed",
  tier: "Bronze",
  service_fee_monthly: 875,
  first_touch_at: "Apr 9, 2026",
  signed_at: "May 22, 2026"
}, {
  account_domain: "cuyahogaprecision.com",
  name: "Cuyahoga Precision Machining",
  vertical: "industrial_b2b",
  machine_sourced: true,
  discovered_by: "pagespeed",
  tier: "Silver",
  service_fee_monthly: 1500,
  first_touch_at: "Apr 22, 2026",
  signed_at: "Jun 1, 2026"
}, {
  account_domain: "riversidepeds.com",
  name: "Riverside Pediatrics",
  vertical: "healthcare",
  machine_sourced: false,
  discovered_by: "referral",
  tier: "Silver",
  service_fee_monthly: 1500,
  first_touch_at: "Apr 2, 2026",
  signed_at: "May 10, 2026"
}].map(owedLine);
const TOTAL_OWED = WON.filter(w => w.qualifying).reduce((s, w) => s + w.twelve_mo_rev_share, 0);

/* pipeline funnel by stage (machine-sourced book) */
const FUNNEL = [{
  stage: "Discovered",
  count: 412
}, {
  stage: "Scored",
  count: 412
}, {
  stage: "Confirmed → Closer",
  count: 96
}, {
  stage: "Engaged",
  count: 31
}, {
  stage: "Opportunity",
  count: 14
}, {
  stage: "Closed-won",
  count: 6
}];

/* source attribution → revenue */
function sourceRollup() {
  const m = {};
  for (const w of WON) {
    const k = w.discovered_by;
    m[k] = m[k] || {
      source: k,
      clients: 0,
      qualifying: 0,
      revshare: 0
    };
    m[k].clients++;
    if (w.qualifying) {
      m[k].qualifying++;
      m[k].revshare += w.twelve_mo_rev_share;
    }
  }
  return Object.values(m).sort((a, b) => b.revshare - a.revshare);
}

/* heat tier for a 0-100 score (mirrors ScoreMeter.tierFor) */
function tierFor(score) {
  if (score >= 90) return {
    key: "hot",
    label: "Hot",
    tone: "hot",
    color: "var(--heat-hot)"
  };
  if (score >= 70) return {
    key: "warm",
    label: "Warm",
    tone: "warm",
    color: "var(--heat-warm)"
  };
  if (score >= 50) return {
    key: "medium",
    label: "Medium",
    tone: "medium",
    color: "var(--heat-medium)"
  };
  if (score >= 25) return {
    key: "cool",
    label: "Cool",
    tone: "cool",
    color: "var(--heat-cool)"
  };
  return {
    key: "cold",
    label: "Cold",
    tone: "cold",
    color: "var(--heat-cold)"
  };
}
const bandTone = {
  A: "hot",
  B: "warm",
  C: "medium",
  R: "cool"
};
const bandColor = {
  A: "var(--heat-hot)",
  B: "var(--heat-warm)",
  C: "var(--heat-medium)",
  R: "var(--heat-cool)"
};
const routeTone = {
  closer: "coral",
  nurture: "cool",
  hold: "neutral",
  reject: "neutral"
};
const fmtMoney = n => "$" + n.toLocaleString("en-US", {
  maximumFractionDigits: 0
});
Object.assign(window.PE, {
  Vertical,
  SignalKind,
  SourceLabel,
  RouteLabel,
  ACCOUNTS,
  byId,
  QUEUE,
  BATCH,
  WON,
  TOTAL_OWED,
  FUNNEL,
  sourceRollup,
  computeScore,
  recommendRoute,
  draftOutreach,
  owedLine,
  tierFor,
  bandTone,
  bandColor,
  routeTone,
  fmtMoney,
  REV_SHARE_RATE,
  TAIL_MONTHS,
  MONTHLY_FLOOR,
  IN_MARKET_TIMING,
  VIABLE_FIT,
  closer: {
    name: "Ray Tomczak",
    title: "Account Executive",
    email: "ray@sixthcitymarketing.com"
  },
  ops: {
    name: "John Sammon",
    title: "Owner / Sixth City",
    email: "john@sixthcitymarketing.com"
  },
  today: "Monday, June 8"
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/data.jsx", error: String((e && e.message) || e) }); }

// app/detail.jsx
try { (() => {
/* ============================================================
   Screen 4 — Account Detail (drill-in)
   The full picture behind one account: evidence trail, score
   breakdown, routing + confirmation history, enriched contact,
   the editable drafted outreach, and the HubSpot stage timeline.
   ============================================================ */
const {
  useState: useStateD
} = React;
const PED = window.PE;
const {
  Button: BtnD,
  Badge: BadgeD,
  ScoreMeter: ScoreMeterD,
  Avatar: AvatarD,
  Input: InputD
} = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoD = PED.Icons;
const DET_CSS = `
.d-back{ display:inline-flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer;
  font-family:var(--font-sans); font-weight:700; font-size:var(--text-sm); color:var(--text-muted); padding:4px 0; margin-bottom:14px; }
.d-back:hover{ color:var(--coral-600); }

.d-hero{ display:flex; align-items:center; gap:22px; background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:22px 24px; margin-bottom:22px; }
.d-hero__meter{ flex:none; }
.d-hero__main{ flex:1; min-width:0; }
.d-hero__top{ display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
.d-hero__name{ font-family:var(--font-display); font-weight:900; font-size:var(--text-3xl); letter-spacing:var(--ls-tight); color:var(--text-strong); margin:0; }
.d-hero__meta{ display:flex; align-items:center; gap:14px; color:var(--text-muted); font-size:var(--text-md); font-weight:600; flex-wrap:wrap; }
.d-hero__meta a{ color:var(--text-link); display:inline-flex; align-items:center; gap:5px; }
.d-hero__meta span{ display:inline-flex; align-items:center; gap:5px; }
.d-hero__band{ flex:none; text-align:center; padding-left:22px; border-left:1px solid var(--border-subtle); }
.d-hero__band-l{ font-family:var(--font-condensed); font-weight:800; font-size:64px; line-height:.85; }
.d-hero__band-c{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em; font-size:11px; font-weight:700; color:var(--text-subtle); }

.d-grid{ display:grid; grid-template-columns:1fr 348px; gap:22px; align-items:start; }
.d-col{ display:flex; flex-direction:column; gap:22px; min-width:0; }
.d-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.d-card__h{ padding:15px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.d-card__h h4{ margin:0; font-size:var(--text-lg); }
.d-card__h .pe-overline{ margin-left:auto; }
.d-card__b{ padding:18px 20px; }

/* score breakdown */
.d-score{ display:flex; flex-direction:column; gap:14px; }
.d-score__rationale{ font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); background:var(--surface-sunken);
  border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:9px 11px; }
.d-axis{ display:grid; grid-template-columns:78px 1fr 42px; align-items:center; gap:12px; }
.d-axis__k{ font-weight:700; font-size:var(--text-sm); color:var(--text-body); }
.d-axis__t{ height:9px; border-radius:99px; background:var(--stone-200); overflow:hidden; }
.d-axis__f{ height:100%; border-radius:99px; }
.d-axis__v{ font-family:var(--font-mono); font-weight:600; font-size:var(--text-sm); text-align:right; color:var(--text-strong); }
.d-axis--total .d-axis__k{ font-weight:800; }

/* signals */
.d-sig{ display:flex; gap:13px; padding:14px 0; border-bottom:1px solid var(--border-subtle); }
.d-sig:last-child{ border-bottom:none; padding-bottom:0; }
.d-sig:first-child{ padding-top:0; }
.d-sig__ico{ width:34px; height:34px; border-radius:var(--radius-sm); display:grid; place-items:center; flex:none; }
.d-sig__main{ flex:1; min-width:0; }
.d-sig__top{ display:flex; align-items:center; gap:9px; margin-bottom:3px; }
.d-sig__kind{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); }
.d-sig__src{ margin-left:auto; font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); }
.d-sig__detail{ font-size:var(--text-sm); color:var(--text-body); line-height:1.45; }
.d-sig__val{ font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); margin-top:3px; }

/* outreach */
.d-out__subj{ margin-bottom:12px; }
.d-out__body{ width:100%; border:1px solid var(--border-default); border-radius:var(--radius-md); padding:13px 14px;
  font-family:var(--font-sans); font-size:var(--text-md); line-height:1.6; color:var(--text-body); background:var(--surface-card);
  resize:vertical; min-height:172px; outline:none; }
.d-out__body:focus{ box-shadow:var(--ring); border-color:var(--coral-500); }
.d-out__foot{ display:flex; align-items:center; gap:10px; margin-top:13px; }
.d-out__reason{ font-size:var(--text-xs); color:var(--text-subtle); display:inline-flex; align-items:center; gap:6px; }

/* rail: contact */
.d-contact{ display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.d-contact__n{ font-weight:800; color:var(--text-strong); }
.d-contact__t{ font-size:var(--text-sm); color:var(--text-muted); }
.d-kv{ display:flex; flex-direction:column; gap:9px; }
.d-kv__row{ display:flex; align-items:center; gap:9px; font-size:var(--text-sm); color:var(--text-body); }
.d-kv__row svg{ color:var(--text-subtle); flex:none; }
.d-kv__row a{ color:var(--text-link); }

/* timeline */
.d-tl{ display:flex; flex-direction:column; }
.d-tl__item{ display:grid; grid-template-columns:18px 1fr; gap:11px; padding-bottom:16px; position:relative; }
.d-tl__item:last-child{ padding-bottom:0; }
.d-tl__rail{ display:flex; flex-direction:column; align-items:center; }
.d-tl__dot{ width:11px; height:11px; border-radius:50%; border:2px solid var(--coral-500); background:var(--surface-card); margin-top:3px; z-index:1; }
.d-tl__dot--done{ background:var(--coral-500); }
.d-tl__line{ width:2px; flex:1; background:var(--border-default); margin-top:2px; }
.d-tl__item:last-child .d-tl__line{ display:none; }
.d-tl__lbl{ font-weight:700; font-size:var(--text-sm); color:var(--text-strong); line-height:1.3; }
.d-tl__when{ font-size:var(--text-xs); color:var(--text-subtle); font-family:var(--font-mono); margin-top:1px; }

.d-route{ display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:var(--radius-md);
  background:var(--surface-sunken); border:1px solid var(--border-subtle); margin-bottom:12px; }
.d-route__txt{ font-size:var(--text-sm); }
.d-route__txt b{ color:var(--text-strong); }
.d-sync{ display:flex; align-items:center; gap:9px; font-size:var(--text-sm); color:var(--text-body); margin-bottom:10px; }
.d-sync svg{ color:var(--green-600); }
`;
(function () {
  if (document.getElementById("pe-det-css")) return;
  const s = document.createElement("style");
  s.id = "pe-det-css";
  s.textContent = DET_CSS;
  document.head.appendChild(s);
})();
const SIG_TINT = {
  site_quality: ["var(--heat-hot-bg)", "var(--coral-600)"],
  ads_active: ["var(--heat-warm-bg)", "var(--orange-700)"],
  seo_gap: ["var(--heat-cool-bg)", "var(--info)"],
  hiring_marketing: ["var(--green-100)", "var(--green-700)"],
  new_location: ["var(--heat-medium-bg)", "#8a5a00"],
  review_velocity: ["var(--heat-medium-bg)", "#8a5a00"]
};
const SIG_ICON = {
  site_quality: IcoD.Gauge,
  ads_active: IcoD.Zap,
  seo_gap: IcoD.Search,
  hiring_marketing: IcoD.Building,
  new_location: IcoD.MapPin,
  review_velocity: IcoD.TrendingUp
};
function STAGES() {
  return ["discovered", "scored", "routed", "pushed", "engaged", "opportunity", "closed_won"];
}
function AccountDetail({
  id,
  onBack
}) {
  const a = PED.byId[id] || PED.QUEUE[0];
  const [subject, setSubject] = useStateD(a.outreach.subject);
  const [body, setBody] = useStateD(a.outreach.body);
  const color = PED.bandColor[a.score.band];
  const eff = a.route.effective;
  const stageList = STAGES();
  const curIdx = stageList.indexOf(a.stage);
  const hist = a.history && a.history.length ? a.history : [["scored", "Jun 8"], ["routed → " + PED.RouteLabel[a.route.recommended], "Jun 8"]];
  return /*#__PURE__*/React.createElement("div", {
    className: "pe-page"
  }, /*#__PURE__*/React.createElement("button", {
    className: "d-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(IcoD.ChevronRight, {
    size: 15,
    style: {
      transform: "rotate(180deg)"
    }
  }), " Back"), /*#__PURE__*/React.createElement("div", {
    className: "d-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-hero__meter"
  }, /*#__PURE__*/React.createElement(ScoreMeterD, {
    score: a.score.total,
    size: 104,
    label: PED.tierFor(a.score.total).label
  })), /*#__PURE__*/React.createElement("div", {
    className: "d-hero__main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-hero__top"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "d-hero__name"
  }, a.name), a.stage === "engaged" ? /*#__PURE__*/React.createElement(BadgeD, {
    tone: "green",
    dot: true
  }, "Engaged \xB7 live") : a.stage === "closed_won" ? /*#__PURE__*/React.createElement(BadgeD, {
    tone: "green",
    dot: true
  }, "Closed-won") : /*#__PURE__*/React.createElement(BadgeD, {
    tone: "neutral",
    dot: true
  }, a.stage[0].toUpperCase() + a.stage.slice(1))), /*#__PURE__*/React.createElement("div", {
    className: "d-hero__meta"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(IcoD.Building, {
    size: 15
  }), PED.Vertical[a.vertical]), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(IcoD.MapPin, {
    size: 15
  }), a.city, ", ", a.state), /*#__PURE__*/React.createElement("a", {
    href: "https://" + a.domain,
    target: "_blank",
    rel: "noreferrer"
  }, /*#__PURE__*/React.createElement(IcoD.Globe, {
    size: 15
  }), a.domain), a.hubspot_id && /*#__PURE__*/React.createElement("span", {
    className: "pe-mono",
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-subtle)"
    }
  }, /*#__PURE__*/React.createElement(IcoD.External, {
    size: 13
  }), a.hubspot_id))), /*#__PURE__*/React.createElement("div", {
    className: "d-hero__band"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-hero__band-l",
    style: {
      color
    }
  }, a.score.band), /*#__PURE__*/React.createElement("div", {
    className: "d-hero__band-c"
  }, "Band"))), /*#__PURE__*/React.createElement("div", {
    className: "d-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card__h"
  }, /*#__PURE__*/React.createElement(IcoD.Gauge, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Score breakdown"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "ABCR")), /*#__PURE__*/React.createElement("div", {
    className: "d-card__b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-score"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-axis"
  }, /*#__PURE__*/React.createElement("span", {
    className: "d-axis__k"
  }, "Fit"), /*#__PURE__*/React.createElement("div", {
    className: "d-axis__t"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-axis__f",
    style: {
      width: a.score.fit + "%",
      background: "var(--stone-500)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "d-axis__v"
  }, a.score.fit)), /*#__PURE__*/React.createElement("div", {
    className: "d-axis"
  }, /*#__PURE__*/React.createElement("span", {
    className: "d-axis__k"
  }, "Timing"), /*#__PURE__*/React.createElement("div", {
    className: "d-axis__t"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-axis__f",
    style: {
      width: a.score.timing + "%",
      background: a.score.timing >= PED.IN_MARKET_TIMING ? "var(--coral-500)" : "var(--heat-cool)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "d-axis__v"
  }, a.score.timing)), /*#__PURE__*/React.createElement("div", {
    className: "d-axis d-axis--total"
  }, /*#__PURE__*/React.createElement("span", {
    className: "d-axis__k"
  }, "Composite"), /*#__PURE__*/React.createElement("div", {
    className: "d-axis__t",
    style: {
      height: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-axis__f",
    style: {
      width: a.score.total + "%",
      background: color
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "d-axis__v",
    style: {
      color
    }
  }, a.score.total)), /*#__PURE__*/React.createElement("div", {
    className: "d-score__rationale"
  }, a.score.rationale, " = ", a.score.total, " \u2192 band ", a.score.band)))), /*#__PURE__*/React.createElement("div", {
    className: "d-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card__h"
  }, /*#__PURE__*/React.createElement(IcoD.Layers, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Signal evidence trail"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, a.signals.length, " signal", a.signals.length === 1 ? "" : "s")), /*#__PURE__*/React.createElement("div", {
    className: "d-card__b"
  }, a.signals.map((s, i) => {
    const SIco = SIG_ICON[s.kind];
    const [bg, fg] = SIG_TINT[s.kind];
    return /*#__PURE__*/React.createElement("div", {
      className: "d-sig",
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "d-sig__ico",
      style: {
        background: bg,
        color: fg
      }
    }, /*#__PURE__*/React.createElement(SIco, {
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      className: "d-sig__main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "d-sig__top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "d-sig__kind"
    }, PED.SignalKind[s.kind]), /*#__PURE__*/React.createElement("span", {
      className: "d-sig__src"
    }, PED.SourceLabel[s.source])), /*#__PURE__*/React.createElement("div", {
      className: "d-sig__detail"
    }, s.detail), /*#__PURE__*/React.createElement("div", {
      className: "d-sig__val"
    }, "value: ", s.value, s.kind === "site_quality" ? " / 100 (Lighthouse)" : " (normalized 0–1)")));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "d-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card__h"
  }, /*#__PURE__*/React.createElement(IcoD.Mail, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Drafted outreach"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "Editable before send")), /*#__PURE__*/React.createElement("div", {
    className: "d-card__b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-out__subj"
  }, /*#__PURE__*/React.createElement(InputD, {
    label: "Subject",
    value: subject,
    onChange: e => setSubject(e.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    className: "pe-overline",
    style: {
      display: "block",
      marginBottom: 7
    }
  }, "Body"), /*#__PURE__*/React.createElement("textarea", {
    className: "d-out__body",
    value: body,
    onChange: e => setBody(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "d-out__foot"
  }, /*#__PURE__*/React.createElement(BtnD, {
    variant: "primary",
    size: "md",
    icon: /*#__PURE__*/React.createElement(IcoD.Send, {
      size: 15
    })
  }, "Approve & queue in HubSpot"), /*#__PURE__*/React.createElement(BtnD, {
    variant: "secondary",
    size: "md",
    icon: /*#__PURE__*/React.createElement(IcoD.Pencil, {
      size: 15
    })
  }, "Save draft"), a.outreach.reason_signal && /*#__PURE__*/React.createElement("span", {
    className: "d-out__reason",
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(IcoD.Zap, {
    size: 13
  }), " Hook: ", PED.SignalKind[a.outreach.reason_signal]))))), /*#__PURE__*/React.createElement("div", {
    className: "d-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card__h"
  }, /*#__PURE__*/React.createElement(IcoD.Route, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Routing")), /*#__PURE__*/React.createElement("div", {
    className: "d-card__b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-route"
  }, /*#__PURE__*/React.createElement(BadgeD, {
    tone: PED.routeTone[eff],
    variant: "solid"
  }, PED.RouteLabel[eff]), /*#__PURE__*/React.createElement("span", {
    className: "d-route__txt"
  }, a.route.confirmed ? /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, a.route.confirmed_route && a.route.confirmed_route !== a.route.recommended ? "Overridden" : "Confirmed"), " by ", a.route.confirmed_by || "ops") : /*#__PURE__*/React.createElement("span", null, "Recommended \u2014 ", /*#__PURE__*/React.createElement("b", null, "awaiting confirmation")))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, a.route.rationale), a.route.history && a.route.history.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 14,
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pe-overline",
    style: {
      marginBottom: 10
    }
  }, "Confirmation history"), /*#__PURE__*/React.createElement("div", {
    className: "d-tl"
  }, a.route.history.map((h, i) => /*#__PURE__*/React.createElement("div", {
    className: "d-tl__item",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-tl__rail"
  }, /*#__PURE__*/React.createElement("span", {
    className: "d-tl__dot d-tl__dot--done"
  }), /*#__PURE__*/React.createElement("span", {
    className: "d-tl__line"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "d-tl__lbl"
  }, Array.isArray(h) ? h[0] : h), Array.isArray(h) && /*#__PURE__*/React.createElement("div", {
    className: "d-tl__when"
  }, h[1])))))))), /*#__PURE__*/React.createElement("div", {
    className: "d-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card__h"
  }, /*#__PURE__*/React.createElement(IcoD.Building, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Enriched contact"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "csv-lead-enrichment")), /*#__PURE__*/React.createElement("div", {
    className: "d-card__b"
  }, a.contact && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "d-contact"
  }, /*#__PURE__*/React.createElement(AvatarD, {
    name: a.contact.name,
    size: "md",
    tone: "ink"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "d-contact__n"
  }, a.contact.name), /*#__PURE__*/React.createElement("div", {
    className: "d-contact__t"
  }, a.contact.title))), /*#__PURE__*/React.createElement("div", {
    className: "d-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-kv__row"
  }, /*#__PURE__*/React.createElement(IcoD.Mail, {
    size: 15
  }), /*#__PURE__*/React.createElement("a", {
    href: "mailto:" + a.contact.email
  }, a.contact.email)), /*#__PURE__*/React.createElement("div", {
    className: "d-kv__row"
  }, /*#__PURE__*/React.createElement(IcoD.Globe, {
    size: 15
  }), /*#__PURE__*/React.createElement("a", {
    href: "https://" + a.domain,
    target: "_blank",
    rel: "noreferrer"
  }, a.domain)), /*#__PURE__*/React.createElement("div", {
    className: "d-kv__row"
  }, /*#__PURE__*/React.createElement(IcoD.MapPin, {
    size: 15
  }), a.city, ", ", a.state))))), /*#__PURE__*/React.createElement("div", {
    className: "d-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-card__h"
  }, /*#__PURE__*/React.createElement(IcoD.External, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "HubSpot"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, a.hubspot_id || "not synced")), /*#__PURE__*/React.createElement("div", {
    className: "d-card__b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "d-sync"
  }, /*#__PURE__*/React.createElement(IcoD.CheckCheck, {
    size: 16
  }), " ", a.hubspot_id ? "Synced — machine-sourced flag set" : "Not yet pushed"), /*#__PURE__*/React.createElement("div", {
    className: "pe-overline",
    style: {
      margin: "8px 0 12px"
    }
  }, "Stage timeline"), /*#__PURE__*/React.createElement("div", {
    className: "d-tl"
  }, stageList.map((st, i) => {
    const done = i <= curIdx;
    return /*#__PURE__*/React.createElement("div", {
      className: "d-tl__item",
      key: st
    }, /*#__PURE__*/React.createElement("div", {
      className: "d-tl__rail"
    }, /*#__PURE__*/React.createElement("span", {
      className: "d-tl__dot" + (done ? " d-tl__dot--done" : ""),
      style: {
        borderColor: done ? "var(--coral-500)" : "var(--border-default)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "d-tl__line"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "d-tl__lbl",
      style: {
        color: done ? "var(--text-strong)" : "var(--text-subtle)"
      }
    }, st.replace("_", "-").replace(/^\w/, c => c.toUpperCase()), i === curIdx ? " — current" : "")));
  })))))));
}
window.PE.AccountDetail = AccountDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/detail.jsx", error: String((e && e.message) || e) }); }

// app/icons.jsx
try { (() => {
/* ============================================================
   Pipeline Engine — Lucide-style icon set (2px stroke, round caps)
   Matches the Sixth City system's icon approach (Lucide).
   ============================================================ */
const I = (paths, vb = "0 0 24 24") => function Icon({
  size = 18,
  stroke = 2,
  className = "",
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: className,
    style: style,
    width: size,
    height: size,
    viewBox: vb,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, paths);
};
const Icons = {
  Sunrise: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 2v8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m4.93 10.93 1.41 1.41"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 18h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 18h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m19.07 10.93-1.41 1.41"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 22H2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8 6 4-4 4 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 18a4 4 0 0 0-8 0"
  }))),
  Route: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "19",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "5",
    r: "3"
  }))),
  Scale: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 21h10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"
  }))),
  Building: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    width: "16",
    height: "20",
    x: "4",
    y: "2",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 22v-4h6v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 6h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 10h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 14h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 10h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 14h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 10h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14h.01"
  }))),
  Search: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  }))),
  External: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M15 3h6v6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 14 21 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
  }))),
  Phone: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
  }))),
  Mail: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    width: "20",
    height: "16",
    x: "2",
    y: "4",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
  }))),
  Check: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))),
  CheckCheck: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 7 17l-5-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m22 10-7.5 7.5L13 16"
  }))),
  X: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  }))),
  Clock: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  }))),
  Zap: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
  }))),
  Flame: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
  }))),
  ArrowRight: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m12 5 7 7-7 7"
  }))),
  ArrowUpRight: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7 7h10v10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 17 17 7"
  }))),
  ChevronDown: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))),
  ChevronRight: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m9 18 6-6-6-6"
  }))),
  Gauge: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m12 14 4-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.34 19a10 10 0 1 1 17.32 0"
  }))),
  Bell: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10.268 21a2 2 0 0 0 3.464 0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
  }))),
  Filter: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polygon", {
    points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
  }))),
  TrendingUp: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M16 7h6v6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m22 7-8.5 8.5-5-5L2 17"
  }))),
  Coins: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "8",
    r: "6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.09 10.37A6 6 0 1 1 10.34 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 6h1v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m16.71 13.88.7.71-2.82 2.82"
  }))),
  ShieldCheck: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m9 12 2 2 4-4"
  }))),
  Cpu: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    width: "16",
    height: "16",
    x: "4",
    y: "4",
    rx: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "6",
    height: "6",
    x: "9",
    y: "9",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 2v2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 20v2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 15h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 9h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 15h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 9h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 2v2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 20v2"
  }))),
  MapPin: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  }))),
  Globe: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12h20"
  }))),
  Gter: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 22h14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 2h14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"
  }))),
  FileText: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v4a2 2 0 0 0 2 2h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 9H8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 13H8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 17H8"
  }))),
  Pencil: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m15 5 4 4"
  }))),
  Send: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21.854 2.147-10.94 10.939"
  }))),
  Pause: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "4",
    width: "4",
    height: "16",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "4",
    width: "4",
    height: "16",
    rx: "1"
  }))),
  Layers: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
  }))),
  Dot: I(/*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3",
    fill: "currentColor",
    stroke: "none"
  })),
  LogTouch: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 12h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 12h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 12h.01"
  }))),
  Sliders: I(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
    x1: "4",
    x2: "4",
    y1: "21",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4",
    x2: "4",
    y1: "10",
    y2: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    x2: "12",
    y1: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    x2: "12",
    y1: "8",
    y2: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "20",
    x2: "20",
    y1: "21",
    y2: "16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "20",
    x2: "20",
    y1: "12",
    y2: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    x2: "6",
    y1: "14",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    x2: "14",
    y1: "8",
    y2: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    x2: "22",
    y1: "16",
    y2: "16"
  })))
};
window.PE = window.PE || {};
window.PE.Icons = Icons;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/icons.jsx", error: String((e && e.message) || e) }); }

// app/queue.jsx
try { (() => {
/* ============================================================
   Screen 1 — Morning Queue (the closer's daily surface)
   A prioritized stack of confirmed, in-market, net-new accounts.
   Band color + "why now" do the triage at a glance.
   ============================================================ */
const {
  useState: useStateQ
} = React;
const PEQ = window.PE;
const {
  Button: BtnQ,
  Badge: BadgeQ
} = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoQ = PEQ.Icons;
const QUEUE_CSS = `
.q-head{ display:flex; align-items:flex-end; gap:24px; margin-bottom:20px; flex-wrap:wrap; }
.q-head > div:first-child{ flex:1 1 380px; min-width:0; }
.q-head h2{ text-wrap:pretty; }
.q-head__metrics{ display:flex; gap:30px; margin-left:auto; flex:none; }
.q-metric{ display:flex; flex-direction:column; gap:2px; }
.q-metric__n{ font-family:var(--font-condensed); font-weight:800; font-size:32px; line-height:1; color:var(--text-strong); }
.q-metric__n .u{ color:var(--coral-500); }
.q-metric__l{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em; font-size:11px; font-weight:700; color:var(--text-subtle); }
.q-filters{ display:flex; align-items:center; gap:8px; margin-bottom:16px; }
.q-chip{ display:inline-flex; align-items:center; gap:7px; height:32px; padding:0 13px; border-radius:var(--radius-pill);
  border:1px solid var(--border-default); background:var(--surface-card); color:var(--text-muted); font-weight:700;
  font-size:var(--text-sm); cursor:pointer; transition:all var(--tap-transition); font-family:var(--font-sans); }
.q-chip:hover{ border-color:var(--border-strong); color:var(--text-body); }
.q-chip--on{ background:var(--ink-700); border-color:var(--ink-700); color:#fff; }
.q-chip__c{ font-family:var(--font-mono); font-size:var(--text-xs); opacity:.7; }
.q-sortnote{ margin-left:auto; font-size:var(--text-sm); color:var(--text-subtle); display:flex; align-items:center; gap:6px; }

.q-list{ display:flex; flex-direction:column; gap:12px; }
.q-card{ display:grid; grid-template-columns:74px 1fr 212px; background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm);
  overflow:hidden; transition:box-shadow var(--tap-transition), transform var(--tap-transition), border-color var(--tap-transition); }
.q-card:hover{ box-shadow:var(--shadow-md); border-color:var(--border-default); }
.q-card--lead{ border-color:var(--coral-200); }

.q-tile{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:14px 6px;
  border-right:1px solid var(--border-subtle); position:relative; }
.q-tile__rank{ position:absolute; top:7px; left:9px; font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); }
.q-tile__band{ font-family:var(--font-condensed); font-weight:800; font-size:34px; line-height:.9; }
.q-tile__score{ font-family:var(--font-mono); font-size:12px; font-weight:600; color:var(--text-muted); }

.q-body{ padding:15px 18px; min-width:0; cursor:pointer; }
.q-body__top{ display:flex; align-items:center; gap:10px; margin-bottom:7px; flex-wrap:wrap; }
.q-name{ font-family:var(--font-display); font-weight:800; font-size:var(--text-lg); color:var(--text-strong); letter-spacing:-.01em; }
.q-body:hover .q-name{ color:var(--coral-600); }
.q-meta{ color:var(--text-muted); font-size:var(--text-sm); font-weight:600; display:inline-flex; align-items:center; gap:5px; }
.q-meta .sep{ opacity:.4; margin:0 2px; }
.q-why{ display:flex; align-items:flex-start; gap:8px; margin:0 0 9px; }
.q-why__ico{ width:26px; height:26px; border-radius:var(--radius-sm); display:grid; place-items:center; flex:none;
  background:var(--heat-hot-bg); color:var(--coral-600); margin-top:1px; }
.q-why__txt{ font-size:var(--text-md); color:var(--text-body); line-height:1.4; font-weight:500; }
.q-why__txt b{ color:var(--text-strong); font-weight:800; }
.q-draft{ display:flex; align-items:center; gap:8px; padding:7px 10px; background:var(--surface-sunken);
  border:1px solid var(--border-subtle); border-radius:var(--radius-sm); }
.q-draft svg{ color:var(--text-subtle); flex:none; }
.q-draft__subj{ font-size:var(--text-sm); color:var(--text-body); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.q-draft__tag{ margin-left:auto; flex:none; }

.q-rail{ border-left:1px solid var(--border-subtle); padding:14px; display:flex; flex-direction:column; gap:8px; background:var(--stone-50); }
.q-rail__stage{ display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; }
.q-rail__hs{ display:inline-flex; align-items:center; gap:5px; font-size:var(--text-xs); font-weight:700; color:var(--text-subtle); font-family:var(--font-mono); }
.q-acts{ display:flex; flex-direction:column; gap:7px; margin-top:auto; }
.q-acts__row{ display:flex; gap:7px; }
`;
(function () {
  if (document.getElementById("pe-queue-css")) return;
  const s = document.createElement("style");
  s.id = "pe-queue-css";
  s.textContent = QUEUE_CSS;
  document.head.appendChild(s);
})();
function timingPct(t) {
  return Math.round(t);
}
function QueueCard({
  a,
  rank,
  onOpen,
  onAction
}) {
  const tone = PEQ.bandTone[a.score.band];
  const color = PEQ.bandColor[a.score.band];
  const strongest = a.signals.slice().sort((x, y) => (y.kind === "site_quality" ? 100 - y.value : y.value) - (x.kind === "site_quality" ? 100 - x.value : x.value))[0];
  const engaged = a.stage === "engaged";
  return /*#__PURE__*/React.createElement("div", {
    className: "q-card" + (rank === 1 ? " q-card--lead" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-tile",
    style: {
      background: PEQ.tierFor(a.score.total).color + "14"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "q-tile__rank"
  }, String(rank).padStart(2, "0")), /*#__PURE__*/React.createElement("span", {
    className: "q-tile__band",
    style: {
      color
    }
  }, a.score.band), /*#__PURE__*/React.createElement("span", {
    className: "q-tile__score"
  }, a.score.total)), /*#__PURE__*/React.createElement("div", {
    className: "q-body",
    onClick: () => onOpen(a.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-body__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "q-name"
  }, a.name), /*#__PURE__*/React.createElement("span", {
    className: "q-meta"
  }, /*#__PURE__*/React.createElement(IcoQ.MapPin, {
    size: 13
  }), a.city, ", ", a.state), /*#__PURE__*/React.createElement("span", {
    className: "q-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), PEQ.Vertical[a.vertical]), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, engaged ? /*#__PURE__*/React.createElement(BadgeQ, {
    tone: "green",
    dot: true
  }, "Engaged \xB7 live") : /*#__PURE__*/React.createElement(BadgeQ, {
    tone: "neutral",
    dot: true
  }, "In sequence"))), /*#__PURE__*/React.createElement("div", {
    className: "q-why"
  }, /*#__PURE__*/React.createElement("span", {
    className: "q-why__ico"
  }, /*#__PURE__*/React.createElement(IcoQ.Zap, {
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    className: "q-why__txt"
  }, strongest.detail)), /*#__PURE__*/React.createElement("div", {
    className: "q-draft"
  }, /*#__PURE__*/React.createElement(IcoQ.Mail, {
    size: 15
  }), /*#__PURE__*/React.createElement("span", {
    className: "q-draft__subj"
  }, a.outreach.subject), /*#__PURE__*/React.createElement("span", {
    className: "q-draft__tag"
  }, /*#__PURE__*/React.createElement(BadgeQ, {
    tone: "coral",
    variant: "outline",
    size: "sm",
    overline: true
  }, "Drafted")))), /*#__PURE__*/React.createElement("div", {
    className: "q-rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-rail__stage"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "Timing"), /*#__PURE__*/React.createElement("span", {
    className: "pe-mono",
    style: {
      fontWeight: 700,
      color
    }
  }, timingPct(a.score.timing), "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 99,
      background: "var(--stone-200)",
      overflow: "hidden",
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: timingPct(a.score.timing) + "%",
      background: color,
      borderRadius: 99
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "q-rail__hs"
  }, /*#__PURE__*/React.createElement(IcoQ.External, {
    size: 12
  }), " ", a.hubspot_id), /*#__PURE__*/React.createElement("div", {
    className: "q-acts"
  }, /*#__PURE__*/React.createElement(BtnQ, {
    variant: "dark",
    size: "sm",
    block: true,
    icon: /*#__PURE__*/React.createElement(IcoQ.Phone, {
      size: 14
    }),
    onClick: () => onAction("call", a)
  }, "Open in HubSpot"), /*#__PURE__*/React.createElement("div", {
    className: "q-acts__row"
  }, /*#__PURE__*/React.createElement(BtnQ, {
    variant: "secondary",
    size: "sm",
    block: true,
    icon: /*#__PURE__*/React.createElement(IcoQ.LogTouch, {
      size: 14
    }),
    onClick: () => onAction("touch", a)
  }, "Log touch"), /*#__PURE__*/React.createElement(BtnQ, {
    variant: "ghost",
    neutral: true,
    size: "sm",
    icon: /*#__PURE__*/React.createElement(IcoQ.Route, {
      size: 14
    }),
    onClick: () => onAction("nurture", a),
    title: "Kick back to nurture"
  })))));
}
function MorningQueue({
  onOpen,
  onAction
}) {
  const [filter, setFilter] = useStateQ("all");
  const all = PEQ.QUEUE;
  const engaged = all.filter(a => a.stage === "engaged");
  const bandA = all.filter(a => a.score.band === "A");
  const shown = filter === "engaged" ? engaged : filter === "a" ? bandA : all;
  const chips = [{
    id: "all",
    label: "All ready",
    c: all.length
  }, {
    id: "engaged",
    label: "Engaged",
    c: engaged.length
  }, {
    id: "a",
    label: "Band A",
    c: bandA.length
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "pe-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pe-overline",
    style: {
      color: "var(--coral-600)"
    }
  }, PEQ.today, " \xB7 Good morning, ", PEQ.closer.name.split(" ")[0]), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "6px 0 0"
    }
  }, "Your queue is ready \u2014 ", all.length, " accounts to work"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-muted)",
      maxWidth: "56ch"
    }
  }, "Confirmed, in-market, net-new. No prospecting from scratch \u2014 start at the top and work down.")), /*#__PURE__*/React.createElement("div", {
    className: "q-head__metrics"
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-metric"
  }, /*#__PURE__*/React.createElement("span", {
    className: "q-metric__n"
  }, all.length), /*#__PURE__*/React.createElement("span", {
    className: "q-metric__l"
  }, "In queue")), /*#__PURE__*/React.createElement("div", {
    className: "q-metric"
  }, /*#__PURE__*/React.createElement("span", {
    className: "q-metric__n"
  }, engaged.length), /*#__PURE__*/React.createElement("span", {
    className: "q-metric__l"
  }, "Live now")), /*#__PURE__*/React.createElement("div", {
    className: "q-metric"
  }, /*#__PURE__*/React.createElement("span", {
    className: "q-metric__n"
  }, bandA.length, /*#__PURE__*/React.createElement("span", {
    className: "u"
  }, "\xB7A")), /*#__PURE__*/React.createElement("span", {
    className: "q-metric__l"
  }, "Top band")))), /*#__PURE__*/React.createElement("div", {
    className: "q-filters"
  }, chips.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    className: "q-chip" + (filter === c.id ? " q-chip--on" : ""),
    onClick: () => setFilter(c.id)
  }, c.label, " ", /*#__PURE__*/React.createElement("span", {
    className: "q-chip__c"
  }, c.c))), /*#__PURE__*/React.createElement("span", {
    className: "q-sortnote"
  }, /*#__PURE__*/React.createElement(IcoQ.TrendingUp, {
    size: 15
  }), " Sorted by score \u2014 highest intent first")), /*#__PURE__*/React.createElement("div", {
    className: "q-list"
  }, shown.map((a, i) => /*#__PURE__*/React.createElement(QueueCard, {
    key: a.id,
    a: a,
    rank: all.indexOf(a) + 1,
    onOpen: onOpen,
    onAction: onAction
  }))));
}
window.PE.MorningQueue = MorningQueue;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/queue.jsx", error: String((e && e.message) || e) }); }

// app/scoreboard.jsx
try { (() => {
/* ============================================================
   Screen 3 — Attribution Scoreboard (the trust layer)
   lead → source → opportunity → closed-won → revenue, plus
   what's owed. Fair and legible to John, not a vendor invoice.
   Provenance + the machine-sourced flag are obvious & auditable.
   ============================================================ */
const PES = window.PE;
const {
  Badge: BadgeS,
  StatBlock: StatBlockS
} = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoS = PES.Icons;
const SB_CSS = `
.sb-hero{ display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr; gap:18px; margin-bottom:22px; }
.sb-stat{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
  padding:18px 20px; box-shadow:var(--shadow-sm); }
.sb-stat--feature{ background:var(--ink-700); border-color:transparent; color:#fff; position:relative; overflow:hidden; }
.sb-stat--feature::after{ content:""; position:absolute; inset:0; background:radial-gradient(80% 90% at 100% 0%, rgba(237,106,60,.22), transparent 60%); pointer-events:none; }
.sb-stat__l{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:700; color:var(--text-subtle); margin-bottom:8px; }
.sb-stat--feature .sb-stat__l{ color:var(--orange-400); }
.sb-stat__v{ font-family:var(--font-condensed); font-weight:800; font-size:46px; line-height:.95; color:var(--text-strong); letter-spacing:-.01em; }
.sb-stat--feature .sb-stat__v{ color:#fff; }
.sb-stat__v .c{ color:var(--coral-500); }
.sb-stat__note{ font-size:var(--text-sm); color:var(--text-muted); margin-top:8px; line-height:1.4; }
.sb-stat--feature .sb-stat__note{ color:rgba(255,255,255,.72); }
.sb-stat__sm{ font-family:var(--font-condensed); font-weight:800; font-size:28px; line-height:1; color:var(--text-strong); }

.sb-2col{ display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-bottom:22px; align-items:start; }
.sb-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.sb-card__h{ padding:16px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:10px; }
.sb-card__h h4{ margin:0; font-size:var(--text-lg); }
.sb-card__h .pe-overline{ margin-left:auto; }
.sb-card__b{ padding:18px 20px; }

/* funnel */
.fn{ display:flex; flex-direction:column; gap:11px; }
.fn-row{ display:grid; grid-template-columns:128px 1fr 56px; align-items:center; gap:12px; }
.fn-row__k{ font-size:var(--text-sm); font-weight:700; color:var(--text-body); }
.fn-row__bar{ height:26px; border-radius:var(--radius-sm); background:var(--gradient-ember); display:flex; align-items:center;
  padding:0 10px; color:#fff; font-family:var(--font-mono); font-weight:600; font-size:var(--text-xs); min-width:34px; }
.fn-row__n{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-lg); color:var(--text-strong); text-align:right; }
.fn-row__cv{ font-size:11px; color:var(--text-subtle); font-family:var(--font-mono); }

/* source rollup */
.src{ display:flex; flex-direction:column; gap:12px; }
.src-row{ display:grid; grid-template-columns:1fr auto; gap:6px 12px; align-items:center; padding-bottom:12px; border-bottom:1px solid var(--border-subtle); }
.src-row:last-child{ border-bottom:none; padding-bottom:0; }
.src-row__name{ font-weight:700; color:var(--text-strong); display:flex; align-items:center; gap:8px; }
.src-row__rev{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-xl); color:var(--green-600); }
.src-row__meta{ font-size:var(--text-xs); color:var(--text-subtle); grid-column:1; }
.src-row__bar{ grid-column:1 / -1; height:6px; border-radius:99px; background:var(--stone-200); overflow:hidden; }
.src-row__fill{ height:100%; border-radius:99px; background:var(--green-500); }

/* won table */
.wt{ width:100%; border-collapse:collapse; }
.wt thead th{ text-align:left; font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em;
  font-size:11px; font-weight:700; color:var(--text-subtle); padding:0 14px 10px; border-bottom:1px solid var(--border-default); white-space:nowrap; }
.wt thead th.r, .wt tbody td.r{ text-align:right; }
.wt tbody td{ padding:13px 14px; border-bottom:1px solid var(--border-subtle); font-size:var(--text-sm); vertical-align:middle; }
.wt tbody tr:last-child td{ border-bottom:none; }
.wt tbody tr.no td{ background:var(--stone-50); color:var(--text-muted); }
.wt__name{ font-weight:800; color:var(--text-strong); }
.wt__sub{ font-size:var(--text-xs); color:var(--text-subtle); }
.wt__fee{ font-family:var(--font-mono); font-weight:600; color:var(--text-body); }
.wt__rev{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-lg); color:var(--green-600); }
.wt__rev.zero{ color:var(--text-subtle); }
.wt__calc{ font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); }
.wt tfoot td{ padding:15px 14px; font-weight:800; color:var(--text-strong); border-top:2px solid var(--border-default); }
.wt tfoot .tot{ font-family:var(--font-condensed); font-size:var(--text-2xl); color:var(--green-600); }
.prov{ display:inline-flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); }

.sb-note{ display:flex; align-items:flex-start; gap:10px; padding:14px 16px; background:var(--surface-cream);
  border:1px solid var(--stone-200); border-radius:var(--radius-md); margin-top:20px; }
.sb-note svg{ color:var(--coral-600); flex:none; margin-top:1px; }
.sb-note__t{ font-size:var(--text-sm); color:var(--text-body); line-height:1.5; }
.sb-note__t b{ color:var(--text-strong); }
.sb-gates{ display:flex; gap:18px; flex-wrap:wrap; margin-top:8px; }
.sb-gate{ display:flex; align-items:center; gap:7px; font-size:var(--text-xs); font-weight:700; color:var(--text-muted); }
.sb-gate svg{ color:var(--green-600); }
`;
(function () {
  if (document.getElementById("pe-sb-css")) return;
  const s = document.createElement("style");
  s.id = "pe-sb-css";
  s.textContent = SB_CSS;
  document.head.appendChild(s);
})();
function Funnel() {
  const max = PES.FUNNEL[0].count;
  return /*#__PURE__*/React.createElement("div", {
    className: "fn"
  }, PES.FUNNEL.map((f, i) => {
    const prev = i ? PES.FUNNEL[i - 1].count : null;
    const cv = prev ? Math.round(f.count / prev * 100) : null;
    return /*#__PURE__*/React.createElement("div", {
      className: "fn-row",
      key: f.stage
    }, /*#__PURE__*/React.createElement("span", {
      className: "fn-row__k"
    }, f.stage), /*#__PURE__*/React.createElement("div", {
      className: "fn-row__bar",
      style: {
        width: Math.max(6, f.count / max * 100) + "%"
      }
    }, cv != null && /*#__PURE__*/React.createElement("span", null, cv, "%")), /*#__PURE__*/React.createElement("span", {
      className: "fn-row__n"
    }, f.count));
  }));
}
function SourceRollup() {
  const rows = PES.sourceRollup();
  const max = Math.max(...rows.map(r => r.revshare), 1);
  return /*#__PURE__*/React.createElement("div", {
    className: "src"
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    className: "src-row",
    key: r.source
  }, /*#__PURE__*/React.createElement("span", {
    className: "src-row__name"
  }, r.source === "pagespeed" ? /*#__PURE__*/React.createElement(IcoS.Gauge, {
    size: 16,
    style: {
      color: "var(--coral-500)"
    }
  }) : r.source === "google_places" ? /*#__PURE__*/React.createElement(IcoS.MapPin, {
    size: 16,
    style: {
      color: "var(--orange-500)"
    }
  }) : /*#__PURE__*/React.createElement(IcoS.Dot, {
    size: 16,
    style: {
      color: "var(--stone-400)"
    }
  }), PES.SourceLabel[r.source]), /*#__PURE__*/React.createElement("span", {
    className: "src-row__rev"
  }, r.revshare ? PES.fmtMoney(r.revshare) : "—"), /*#__PURE__*/React.createElement("span", {
    className: "src-row__meta"
  }, r.qualifying, " qualifying client", r.qualifying === 1 ? "" : "s", r.clients > r.qualifying ? ` · ${r.clients - r.qualifying} not credited` : ""), /*#__PURE__*/React.createElement("div", {
    className: "src-row__bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "src-row__fill",
    style: {
      width: r.revshare / max * 100 + "%"
    }
  })))));
}
function Scoreboard({
  onOpen
}) {
  const qCount = PES.WON.filter(w => w.qualifying).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "pe-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-head",
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pe-overline",
    style: {
      color: "var(--coral-600)"
    }
  }, "Trust layer \xB7 audit any time"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "6px 0 0"
    }
  }, "Attribution Scoreboard"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-muted)",
      maxWidth: "64ch"
    }
  }, "Every machine-sourced lead, from first touch to closed-won revenue \u2014 and exactly what the 5% / 12-month rev-share settles against. All inside your HubSpot.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(BadgeS, {
    tone: "green",
    dot: true
  }, "Engagement term active"))), /*#__PURE__*/React.createElement("div", {
    className: "sb-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-stat sb-stat--feature"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__l"
  }, "Qualifying 12-mo rev-share owed"), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__v"
  }, PES.fmtMoney(PES.TOTAL_OWED)), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__note"
  }, "Across ", qCount, " net-new, machine-sourced, signed clients. Each tail runs 12 months from that client's signing date.")), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__l"
  }, "Closed-won"), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__v"
  }, PES.FUNNEL[PES.FUNNEL.length - 1].count), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__note"
  }, qCount, " machine-sourced \xB7 1 referral (not credited)")), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__l"
  }, "In pipeline"), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__v"
  }, PES.FUNNEL[4].count), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__note"
  }, "Open opportunities, machine-sourced")), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__l"
  }, "Monthly floor"), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__v"
  }, PES.fmtMoney(PES.MONTHLY_FLOOR)), /*#__PURE__*/React.createElement("div", {
    className: "sb-stat__note"
  }, "Credited against rev-share \u2014 not additive."))), /*#__PURE__*/React.createElement("div", {
    className: "sb-2col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-card__h"
  }, /*#__PURE__*/React.createElement(IcoS.Filter, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Pipeline funnel"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "Machine-sourced book")), /*#__PURE__*/React.createElement("div", {
    className: "sb-card__b"
  }, /*#__PURE__*/React.createElement(Funnel, null))), /*#__PURE__*/React.createElement("div", {
    className: "sb-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-card__h"
  }, /*#__PURE__*/React.createElement(IcoS.Layers, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Revenue by source"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "Provenance")), /*#__PURE__*/React.createElement("div", {
    className: "sb-card__b"
  }, /*#__PURE__*/React.createElement(SourceRollup, null)))), /*#__PURE__*/React.createElement("div", {
    className: "sb-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb-card__h"
  }, /*#__PURE__*/React.createElement(IcoS.Coins, {
    size: 18,
    style: {
      color: "var(--coral-500)"
    }
  }), /*#__PURE__*/React.createElement("h4", null, "Closed-won \u2014 rev-share detail"), /*#__PURE__*/React.createElement("span", {
    className: "pe-overline"
  }, "5% \xD7 service fee \xD7 12 mo")), /*#__PURE__*/React.createElement("div", {
    className: "sb-card__b",
    style: {
      padding: "8px 8px 4px"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "wt"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Client"), /*#__PURE__*/React.createElement("th", null, "Tier"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "Service fee /mo"), /*#__PURE__*/React.createElement("th", null, "Machine-sourced"), /*#__PURE__*/React.createElement("th", null, "Discovered by"), /*#__PURE__*/React.createElement("th", null, "Signed"), /*#__PURE__*/React.createElement("th", {
    className: "r"
  }, "12-mo rev-share"))), /*#__PURE__*/React.createElement("tbody", null, PES.WON.map(w => /*#__PURE__*/React.createElement("tr", {
    key: w.account_domain,
    className: w.qualifying ? "" : "no"
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "wt__name"
  }, w.name), /*#__PURE__*/React.createElement("div", {
    className: "wt__sub"
  }, PES.Vertical[w.vertical], " \xB7 ", w.account_domain)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(BadgeS, {
    tone: w.tier === "Gold" ? "warning" : w.tier === "Silver" ? "neutral" : "neutral",
    variant: "outline",
    size: "sm"
  }, w.tier)), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wt__fee"
  }, PES.fmtMoney(w.service_fee_monthly))), /*#__PURE__*/React.createElement("td", null, w.machine_sourced ? /*#__PURE__*/React.createElement(BadgeS, {
    tone: "green",
    dot: true,
    icon: /*#__PURE__*/React.createElement(IcoS.Cpu, {
      size: 12
    })
  }, "Machine") : /*#__PURE__*/React.createElement(BadgeS, {
    tone: "neutral",
    dot: true
  }, "Referral")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "prov"
  }, w.discovered_by === "pagespeed" ? /*#__PURE__*/React.createElement(IcoS.Gauge, {
    size: 13
  }) : w.discovered_by === "google_places" ? /*#__PURE__*/React.createElement(IcoS.MapPin, {
    size: 13
  }) : /*#__PURE__*/React.createElement(IcoS.Dot, {
    size: 13
  }), PES.SourceLabel[w.discovered_by])), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pe-mono",
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, w.signed_at)), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wt__rev" + (w.qualifying ? "" : " zero")
  }, w.qualifying ? PES.fmtMoney(w.twelve_mo_rev_share) : "$0"), /*#__PURE__*/React.createElement("div", {
    className: "wt__calc"
  }, w.qualifying ? `5% × ${PES.fmtMoney(w.service_fee_monthly)} × 12` : w.note))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "6"
  }, "Total qualifying 12-month rev-share"), /*#__PURE__*/React.createElement("td", {
    className: "r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tot"
  }, PES.fmtMoney(PES.TOTAL_OWED)))))))), /*#__PURE__*/React.createElement("div", {
    className: "sb-note"
  }, /*#__PURE__*/React.createElement(IcoS.ShieldCheck, {
    size: 18
  }), /*#__PURE__*/React.createElement("div", {
    className: "sb-note__t"
  }, /*#__PURE__*/React.createElement("b", null, "How an obligation is created."), " Three gates must all hold \u2014 the row is credited only when every one is true. The $", PES.MONTHLY_FLOOR.toFixed(0), "/mo engagement is ", /*#__PURE__*/React.createElement("b", null, "credited against"), " rev-share, never added on top.", /*#__PURE__*/React.createElement("div", {
    className: "sb-gates"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sb-gate"
  }, /*#__PURE__*/React.createElement(IcoS.Check, {
    size: 14
  }), " Net-new logo (no existing accounts or upsells)"), /*#__PURE__*/React.createElement("span", {
    className: "sb-gate"
  }, /*#__PURE__*/React.createElement(IcoS.Check, {
    size: 14
  }), " Machine-sourced flag set in HubSpot"), /*#__PURE__*/React.createElement("span", {
    className: "sb-gate"
  }, /*#__PURE__*/React.createElement(IcoS.Check, {
    size: 14
  }), " Signed while the term is active")))));
}
window.PE.Scoreboard = Scoreboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/scoreboard.jsx", error: String((e && e.message) || e) }); }

// app/shell.jsx
try { (() => {
/* ============================================================
   Pipeline Engine — app shell (sidebar + topbar)
   Charcoal sidebar (brand dark panel), stone page surface.
   ============================================================ */
const {
  Icons
} = window.PE;
const {
  Avatar,
  Badge
} = window.SixthCityMarketingDesignSystem_4d5a9e;
const SHELL_CSS = `
.pe-app{ display:grid; grid-template-columns:236px 1fr; height:100vh; overflow:hidden; background:var(--surface-page); }

/* ---------- sidebar ---------- */
.pe-side{ background:var(--ink-700); color:var(--cream); display:flex; flex-direction:column; min-height:0;
  border-right:1px solid rgba(0,0,0,.2); }
.pe-side__brand{ padding:20px 18px 14px; border-bottom:1px solid rgba(255,255,255,.09); }
.pe-side__logo{ width:138px; display:block; margin-bottom:12px; }
.pe-side__product{ display:flex; align-items:center; gap:7px; }
.pe-side__product .scm-overline{ color:var(--orange-400); font-size:var(--text-xs); letter-spacing:.16em; }
.pe-side__product svg{ color:var(--orange-400); }
.pe-side__nav{ padding:14px 12px; display:flex; flex-direction:column; gap:3px; flex:1; min-height:0; overflow:auto; }
.pe-side__label{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.14em; font-size:11px;
  color:rgba(255,255,255,.42); font-weight:700; padding:14px 12px 6px; }
.pe-nav{ display:flex; align-items:center; gap:11px; padding:9px 12px; border-radius:var(--radius-md);
  color:rgba(255,255,255,.74); font-weight:700; font-size:var(--text-md); cursor:pointer; position:relative;
  border:none; background:transparent; width:100%; text-align:left; font-family:var(--font-sans);
  transition:background var(--tap-transition), color var(--tap-transition); }
.pe-nav:hover{ background:rgba(255,255,255,.07); color:#fff; }
.pe-nav svg{ flex:none; opacity:.9; }
.pe-nav__count{ margin-left:auto; font-family:var(--font-mono); font-size:var(--text-xs); font-weight:600;
  background:rgba(255,255,255,.12); color:rgba(255,255,255,.85); padding:1px 7px; border-radius:var(--radius-pill); }
.pe-nav--on{ background:var(--coral-500); color:#fff; }
.pe-nav--on:hover{ background:var(--coral-500); }
.pe-nav--on svg{ opacity:1; }
.pe-nav--on .pe-nav__count{ background:rgba(0,0,0,.22); color:#fff; }

.pe-side__foot{ border-top:1px solid rgba(255,255,255,.09); padding:12px; }
.pe-who{ display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:var(--radius-md); }
.pe-who__name{ font-weight:800; font-size:var(--text-sm); color:#fff; line-height:1.2; }
.pe-who__role{ font-size:var(--text-xs); color:rgba(255,255,255,.6); }

/* ---------- main ---------- */
.pe-main{ display:flex; flex-direction:column; min-width:0; min-height:0; }
.pe-top{ height:64px; flex:none; background:var(--surface-card); border-bottom:1px solid var(--border-subtle);
  display:flex; align-items:center; gap:16px; padding:0 28px; }
.pe-top__title{ font-family:var(--font-display); font-weight:900; font-size:var(--text-xl); letter-spacing:var(--ls-tight);
  color:var(--text-strong); line-height:1.1; }
.pe-top__sub{ font-size:var(--text-sm); color:var(--text-muted); margin-top:1px; }
.pe-top__spacer{ flex:1; }
.pe-top__search{ display:flex; align-items:center; gap:8px; height:38px; padding:0 12px; min-width:230px;
  background:var(--surface-sunken); border:1px solid var(--border-subtle); border-radius:var(--radius-md);
  color:var(--text-subtle); font-size:var(--text-sm); }
.pe-top__search input{ border:none; background:transparent; outline:none; font-family:var(--font-sans);
  font-size:var(--text-sm); color:var(--text-body); width:100%; }
.pe-iconbtn{ width:38px; height:38px; display:grid; place-items:center; border-radius:var(--radius-md);
  border:1px solid var(--border-subtle); background:var(--surface-card); color:var(--text-muted); cursor:pointer;
  position:relative; transition:background var(--tap-transition); }
.pe-iconbtn:hover{ background:var(--surface-sunken); color:var(--text-body); }
.pe-iconbtn__dot{ position:absolute; top:7px; right:8px; width:7px; height:7px; border-radius:50%;
  background:var(--coral-500); border:2px solid var(--surface-card); }

.pe-scroll{ flex:1; min-height:0; overflow:auto; }
.pe-page{ max-width:1240px; margin:0 auto; padding:28px 28px 64px; }

/* shared bits used across screens */
.pe-overline{ font-family:var(--font-condensed); font-weight:700; text-transform:uppercase; letter-spacing:.14em;
  font-size:var(--text-xs); color:var(--text-subtle); }
.pe-mono{ font-family:var(--font-mono); }
.pe-vert{ display:inline-flex; align-items:center; gap:6px; color:var(--text-muted); font-size:var(--text-sm); font-weight:600; }
.pe-vert svg{ opacity:.7; }
`;
function injectShellCSS() {
  if (document.getElementById("pe-shell-css")) return;
  const s = document.createElement("style");
  s.id = "pe-shell-css";
  s.textContent = SHELL_CSS;
  document.head.appendChild(s);
}
injectShellCSS();
const NAV = [{
  id: "queue",
  label: "Morning Queue",
  icon: Icons.Sunrise
}, {
  id: "triage",
  label: "Triage Board",
  icon: Icons.Route
}, {
  id: "scoreboard",
  label: "Scoreboard",
  icon: Icons.Scale
}, {
  id: "accounts",
  label: "Accounts",
  icon: Icons.Building
}];
function Sidebar({
  view,
  onNav,
  counts
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "pe-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pe-side__brand"
  }, /*#__PURE__*/React.createElement("img", {
    className: "pe-side__logo",
    src: "ds/assets/logo-knockout.png",
    alt: "Sixth City Marketing"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pe-side__product"
  }, /*#__PURE__*/React.createElement(Icons.Cpu, {
    size: 14,
    stroke: 2.4
  }), /*#__PURE__*/React.createElement("span", {
    className: "scm-overline"
  }, "Pipeline Engine"))), /*#__PURE__*/React.createElement("nav", {
    className: "pe-side__nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pe-side__label"
  }, "Workspace"), NAV.map(n => {
    const on = view === n.id || view === "detail" && n.id === "accounts";
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      className: "pe-nav" + (on ? " pe-nav--on" : ""),
      onClick: () => onNav(n.id)
    }, /*#__PURE__*/React.createElement(n.icon, {
      size: 18
    }), /*#__PURE__*/React.createElement("span", null, n.label), counts[n.id] != null && /*#__PURE__*/React.createElement("span", {
      className: "pe-nav__count"
    }, counts[n.id]));
  })), /*#__PURE__*/React.createElement("div", {
    className: "pe-side__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pe-who"
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: window.PE.closer.name,
    size: "sm",
    tone: "coral",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pe-who__name"
  }, window.PE.closer.name), /*#__PURE__*/React.createElement("div", {
    className: "pe-who__role"
  }, window.PE.closer.title)))));
}
function Topbar({
  title,
  sub,
  right
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "pe-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pe-top__title"
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    className: "pe-top__sub"
  }, sub)), /*#__PURE__*/React.createElement("div", {
    className: "pe-top__spacer"
  }), right, /*#__PURE__*/React.createElement("div", {
    className: "pe-top__search"
  }, /*#__PURE__*/React.createElement(Icons.Search, {
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search accounts\u2026"
  })), /*#__PURE__*/React.createElement("button", {
    className: "pe-iconbtn",
    title: "Notifications"
  }, /*#__PURE__*/React.createElement(Icons.Bell, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "pe-iconbtn__dot"
  })));
}
window.PE.Sidebar = Sidebar;
window.PE.Topbar = Topbar;
window.PE.NAV = NAV;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/shell.jsx", error: String((e && e.message) || e) }); }

// app/triage.jsx
try { (() => {
/* ============================================================
   Screen 2 — Triage / Routing Board (the HITL gate)
   A decision queue: confirm or override the engine's routing
   before anything acts. Timing-first. fit×timing shown as a
   tiny 2-axis read so the override call is visual.
   ============================================================ */
const {
  useState: useStateT,
  useMemo: useMemoT
} = React;
const PET = window.PE;
const {
  Button: BtnT,
  Badge: BadgeT
} = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoT = PET.Icons;
const TRIAGE_CSS = `
.t-grid{ display:grid; grid-template-columns:1fr 332px; gap:22px; align-items:start; }
.t-bar{ display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:12px 16px;
  background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); box-shadow:var(--shadow-xs); }
.t-bar__txt{ font-size:var(--text-sm); color:var(--text-muted); }
.t-bar__txt b{ color:var(--text-strong); font-weight:800; }
.t-bar__acts{ margin-left:auto; display:flex; gap:8px; }

.t-rows{ display:flex; flex-direction:column; gap:9px; }
.t-row{ display:grid; grid-template-columns:1fr 188px 230px; gap:14px; align-items:center;
  background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md);
  padding:13px 15px; box-shadow:var(--shadow-xs); transition:border-color var(--tap-transition), box-shadow var(--tap-transition); }
.t-row:hover{ border-color:var(--border-default); box-shadow:var(--shadow-sm); }
.t-row--hl{ border-color:var(--coral-300); box-shadow:0 0 0 3px var(--coral-50); }
.t-row--done{ background:var(--stone-50); }

.t-rec{ min-width:0; }
.t-rec__top{ display:flex; align-items:center; gap:9px; margin-bottom:4px; flex-wrap:wrap; }
.t-rec__name{ font-weight:800; font-size:var(--text-md); color:var(--text-strong); cursor:pointer; }
.t-rec__name:hover{ color:var(--coral-600); }
.t-rec__vert{ font-size:var(--text-xs); color:var(--text-subtle); font-weight:600; }
.t-rec__why{ font-size:var(--text-sm); color:var(--text-muted); line-height:1.35; display:flex; align-items:center; gap:6px; }
.t-rec__why svg{ flex:none; opacity:.7; }

/* fit/timing dual read */
.t-axes{ display:flex; flex-direction:column; gap:7px; }
.t-axis{ display:grid; grid-template-columns:34px 1fr 30px; align-items:center; gap:8px; }
.t-axis__k{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.08em; font-size:10px; font-weight:700; color:var(--text-subtle); }
.t-axis__track{ height:7px; border-radius:99px; background:var(--stone-200); overflow:hidden; position:relative; }
.t-axis__fill{ height:100%; border-radius:99px; }
.t-axis__v{ font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--text-body); text-align:right; }
.t-axis__gate{ position:absolute; top:-2px; bottom:-2px; width:2px; background:var(--ink-700); opacity:.55; }

.t-ctrl{ display:flex; flex-direction:column; gap:7px; }
.t-ctrl__route{ display:flex; align-items:center; gap:6px; }
.t-seg{ display:flex; gap:0; border:1px solid var(--border-default); border-radius:var(--radius-sm); overflow:hidden; background:var(--surface-card); }
.t-seg button{ border:none; background:transparent; padding:5px 8px; font-size:11px; font-weight:700; font-family:var(--font-sans);
  color:var(--text-muted); cursor:pointer; border-right:1px solid var(--border-subtle); transition:all var(--tap-transition); }
.t-seg button:last-child{ border-right:none; }
.t-seg button:hover{ background:var(--surface-sunken); }
.t-seg button.on{ background:var(--ink-700); color:#fff; }
.t-confirmed{ display:flex; align-items:center; gap:7px; font-size:var(--text-sm); }
.t-confirmed__by{ font-size:var(--text-xs); color:var(--text-subtle); }

/* scatter panel */
.t-panel{ position:sticky; top:0; background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:18px; }
.t-panel h4{ margin:0 0 2px; font-size:var(--text-lg); }
.t-panel__sub{ font-size:var(--text-sm); color:var(--text-muted); margin:0 0 14px; }
.t-legend{ display:flex; flex-direction:column; gap:7px; margin-top:14px; padding-top:14px; border-top:1px solid var(--border-subtle); }
.t-leg{ display:flex; align-items:center; gap:9px; font-size:var(--text-sm); color:var(--text-body); }
.t-leg__sw{ width:11px; height:11px; border-radius:3px; flex:none; }
.t-leg__c{ margin-left:auto; font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-subtle); }
.t-dot{ cursor:pointer; transition:r .12s; }
`;
(function () {
  if (document.getElementById("pe-triage-css")) return;
  const s = document.createElement("style");
  s.id = "pe-triage-css";
  s.textContent = TRIAGE_CSS;
  document.head.appendChild(s);
})();
const ROUTE_OPTS = ["closer", "nurture", "hold", "reject"];
const routeColor = {
  closer: "var(--coral-500)",
  nurture: "var(--heat-cool)",
  hold: "var(--stone-500)",
  reject: "var(--stone-400)"
};
function Scatter({
  rows,
  decisions,
  hover,
  setHover
}) {
  const W = 296,
    H = 230,
    padL = 34,
    padB = 30,
    padT = 10,
    padR = 10;
  const xd = [50, 100],
    yd = [0, 100];
  const px = f => padL + (f - xd[0]) / (xd[1] - xd[0]) * (W - padL - padR);
  const py = t => H - padB - (t - yd[0]) / (yd[1] - yd[0]) * (H - padT - padB);
  const gateY = py(PET.IN_MARKET_TIMING);
  const fitX = px(PET.VIABLE_FIT);
  return /*#__PURE__*/React.createElement("svg", {
    width: W,
    height: H,
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: padL,
    y: padT,
    width: W - padL - padR,
    height: gateY - padT,
    fill: "var(--coral-500)",
    opacity: "0.05"
  }), /*#__PURE__*/React.createElement("rect", {
    x: fitX,
    y: gateY,
    width: W - padR - fitX,
    height: H - padB - gateY,
    fill: "var(--heat-cool)",
    opacity: "0.06"
  }), /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: padT,
    x2: padL,
    y2: H - padB,
    stroke: "var(--border-default)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: H - padB,
    x2: W - padR,
    y2: H - padB,
    stroke: "var(--border-default)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: gateY,
    x2: W - padR,
    y2: gateY,
    stroke: "var(--ink-700)",
    strokeWidth: "1.5",
    strokeDasharray: "4 3",
    opacity: "0.6"
  }), /*#__PURE__*/React.createElement("text", {
    x: W - padR,
    y: gateY - 5,
    textAnchor: "end",
    fontSize: "9",
    fill: "var(--ink-700)",
    fontWeight: "700",
    fontFamily: "var(--font-condensed)",
    letterSpacing: "0.08em"
  }, "IN-MARKET GATE \xB7 55"), /*#__PURE__*/React.createElement("line", {
    x1: fitX,
    y1: gateY,
    x2: fitX,
    y2: H - padB,
    stroke: "var(--stone-400)",
    strokeWidth: "1",
    strokeDasharray: "3 3",
    opacity: "0.7"
  }), /*#__PURE__*/React.createElement("text", {
    x: (padL + W - padR) / 2,
    y: H - 8,
    textAnchor: "middle",
    fontSize: "10",
    fill: "var(--text-subtle)",
    fontWeight: "700",
    fontFamily: "var(--font-condensed)",
    letterSpacing: "0.1em"
  }, "FIT \u2192"), /*#__PURE__*/React.createElement("text", {
    x: 12,
    y: (padT + H - padB) / 2,
    textAnchor: "middle",
    fontSize: "10",
    fill: "var(--text-subtle)",
    fontWeight: "700",
    fontFamily: "var(--font-condensed)",
    letterSpacing: "0.1em",
    transform: `rotate(-90 12 ${(padT + H - padB) / 2})`
  }, "TIMING \u2192"), rows.map(a => {
    const eff = decisions[a.id]?.route || a.route.recommended;
    const isH = hover === a.id;
    return /*#__PURE__*/React.createElement("circle", {
      key: a.id,
      className: "t-dot",
      cx: px(a.score.fit),
      cy: py(a.score.timing),
      r: isH ? 8 : 5.5,
      fill: routeColor[eff],
      stroke: "#fff",
      strokeWidth: "1.5",
      opacity: hover && !isH ? 0.4 : 0.95,
      onMouseEnter: () => setHover(a.id),
      onMouseLeave: () => setHover(null)
    });
  }));
}
function Axis({
  k,
  v,
  color,
  gate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "t-axis"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-axis__k"
  }, k), /*#__PURE__*/React.createElement("div", {
    className: "t-axis__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-axis__fill",
    style: {
      width: v + "%",
      background: color
    }
  }), gate != null && /*#__PURE__*/React.createElement("span", {
    className: "t-axis__gate",
    style: {
      left: gate + "%"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "t-axis__v"
  }, Math.round(v)));
}
function TriageRow({
  a,
  decision,
  onDecide,
  onOpen,
  hover,
  setHover
}) {
  const eff = decision?.route || (a.route.confirmed ? a.route.effective : null);
  const done = !!decision || a.route.confirmed;
  const recColor = routeColor[a.route.recommended];
  const overridden = done && eff !== a.route.recommended;
  return /*#__PURE__*/React.createElement("div", {
    className: "t-row" + (hover === a.id ? " t-row--hl" : "") + (done ? " t-row--done" : ""),
    onMouseEnter: () => setHover(a.id),
    onMouseLeave: () => setHover(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-rec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-rec__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-rec__name",
    onClick: () => onOpen(a.id)
  }, a.name), /*#__PURE__*/React.createElement("span", {
    className: "t-rec__vert"
  }, PET.Vertical[a.vertical], " \xB7 ", a.city, ", ", a.state)), /*#__PURE__*/React.createElement("div", {
    className: "t-rec__why"
  }, /*#__PURE__*/React.createElement(IcoT.Route, {
    size: 13
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: recColor,
      fontWeight: 800
    }
  }, PET.RouteLabel[a.route.recommended]), " \u2014 ", a.route.rationale))), /*#__PURE__*/React.createElement("div", {
    className: "t-axes"
  }, /*#__PURE__*/React.createElement(Axis, {
    k: "Fit",
    v: a.score.fit,
    color: "var(--stone-500)",
    gate: PET.VIABLE_FIT
  }), /*#__PURE__*/React.createElement(Axis, {
    k: "Time",
    v: a.score.timing,
    color: a.score.timing >= PET.IN_MARKET_TIMING ? "var(--coral-500)" : "var(--heat-cool)",
    gate: PET.IN_MARKET_TIMING
  })), /*#__PURE__*/React.createElement("div", {
    className: "t-ctrl"
  }, !done ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "t-seg",
    role: "group",
    "aria-label": "route"
  }, ROUTE_OPTS.map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    className: r === a.route.recommended ? "on" : "",
    onClick: () => onDecide(a.id, r),
    title: "Route to " + PET.RouteLabel[r]
  }, PET.RouteLabel[r]))), /*#__PURE__*/React.createElement(BtnT, {
    variant: "positive",
    size: "sm",
    block: true,
    icon: /*#__PURE__*/React.createElement(IcoT.Check, {
      size: 14
    }),
    onClick: () => onDecide(a.id, a.route.recommended)
  }, "Confirm ", PET.RouteLabel[a.route.recommended])) : /*#__PURE__*/React.createElement("div", {
    className: "t-confirmed"
  }, /*#__PURE__*/React.createElement(BadgeT, {
    tone: overridden ? "warning" : "green",
    dot: true,
    icon: overridden ? /*#__PURE__*/React.createElement(IcoT.Pencil, {
      size: 12
    }) : /*#__PURE__*/React.createElement(IcoT.CheckCheck, {
      size: 12
    })
  }, overridden ? "Overridden → " : "Confirmed → ", PET.RouteLabel[eff]), /*#__PURE__*/React.createElement("span", {
    className: "t-confirmed__by"
  }, decision?.by || a.route.confirmed_by))));
}
function TriageBoard({
  onOpen
}) {
  const seed = useMemoT(() => {
    const d = {};
    for (const a of PET.BATCH) if (a.route.confirmed) d[a.id] = {
      route: a.route.effective,
      by: a.route.confirmed_by
    };
    return d;
  }, []);
  const [decisions, setDecisions] = useStateT(seed);
  const [hover, setHover] = useStateT(null);
  const decide = (id, route) => setDecisions(d => ({
    ...d,
    [id]: {
      route,
      by: "J. Sammon · just now"
    }
  }));
  const confirmObvious = () => setDecisions(d => {
    const nd = {
      ...d
    };
    for (const a of PET.BATCH) if (!nd[a.id] && a.route.recommended === "closer" && a.score.band === "A") nd[a.id] = {
      route: "closer",
      by: "J. Sammon"
    };
    return nd;
  });
  const pending = PET.BATCH.filter(a => !decisions[a.id]);
  const obvious = PET.BATCH.filter(a => !decisions[a.id] && a.route.recommended === "closer" && a.score.band === "A");
  const rollup = ROUTE_OPTS.map(r => ({
    r,
    n: PET.BATCH.filter(a => (decisions[a.id]?.route || a.route.recommended) === r).length
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "pe-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "q-head",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pe-overline",
    style: {
      color: "var(--coral-600)"
    }
  }, "Batch scored ", PET.today, " \xB7 06:00 ET"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "6px 0 0"
    }
  }, PET.BATCH.length, " accounts routed \u2014 confirm before anything acts"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--text-muted)",
      maxWidth: "62ch"
    }
  }, "Nothing enters a closer sequence unconfirmed. The engine recommends; you confirm the obvious in bulk and single out the judgment calls."))), /*#__PURE__*/React.createElement("div", {
    className: "t-bar"
  }, /*#__PURE__*/React.createElement(IcoT.ShieldCheck, {
    size: 18,
    style: {
      color: "var(--green-600)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "t-bar__txt"
  }, /*#__PURE__*/React.createElement("b", null, pending.length), " awaiting your call \xB7 ", /*#__PURE__*/React.createElement("b", null, PET.BATCH.length - pending.length), " confirmed"), /*#__PURE__*/React.createElement("div", {
    className: "t-bar__acts"
  }, /*#__PURE__*/React.createElement(BtnT, {
    variant: "secondary",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(IcoT.Zap, {
      size: 14
    }),
    onClick: confirmObvious,
    disabled: !obvious.length
  }, "Bulk-confirm ", obvious.length, " obvious (A \u2192 closer)"))), /*#__PURE__*/React.createElement("div", {
    className: "t-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-rows"
  }, PET.BATCH.map(a => /*#__PURE__*/React.createElement(TriageRow, {
    key: a.id,
    a: a,
    decision: decisions[a.id],
    onDecide: decide,
    onOpen: onOpen,
    hover: hover,
    setHover: setHover
  }))), /*#__PURE__*/React.createElement("div", {
    className: "t-panel"
  }, /*#__PURE__*/React.createElement("h4", null, "Fit \xD7 Timing"), /*#__PURE__*/React.createElement("p", {
    className: "t-panel__sub"
  }, "Timing trumps fit. Above the gate \u2192 closer; good-fit but cold \u2192 nurture."), /*#__PURE__*/React.createElement(Scatter, {
    rows: PET.BATCH,
    decisions: decisions,
    hover: hover,
    setHover: setHover
  }), /*#__PURE__*/React.createElement("div", {
    className: "t-legend"
  }, rollup.map(x => /*#__PURE__*/React.createElement("div", {
    className: "t-leg",
    key: x.r,
    onMouseEnter: () => setHover(null)
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-leg__sw",
    style: {
      background: routeColor[x.r]
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, PET.RouteLabel[x.r]), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-subtle)"
    }
  }, x.r === "closer" ? "in-market now" : x.r === "nurture" ? "good fit, cold" : x.r === "hold" ? "revisit later" : "out"), /*#__PURE__*/React.createElement("span", {
    className: "t-leg__c"
  }, x.n)))))));
}
window.PE.TriageBoard = TriageBoard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "app/triage.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
/**
 * 360 brand lockup. The "36" is set in the rounded display font; the "0" is the
 * signature degree-ring mark. Recreation of the official wordmark — see assets/README.md.
 */
function Logo({
  variant = 'full',
  tone = 'brand',
  size = 28,
  className = '',
  style = {}
}) {
  const uid = React.useMemo(() => 'lg' + Math.random().toString(36).slice(2, 8), []);
  const isInverse = tone === 'inverse';
  const isDark = tone === 'dark';
  const solid = isInverse ? '#ffffff' : isDark ? '#0e0d0b' : null;
  const ringD = 'M50 3a47 47 0 1 0 0.01 0Z M50 29a21 21 0 1 1 -0.01 0Z';
  const ring = /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    "aria-hidden": "true",
    style: {
      height: '0.84em',
      width: '0.84em',
      display: 'block',
      marginLeft: '0.02em'
    }
  }, !solid && /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: uid,
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#4a9082"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "48%",
    stopColor: "#236054"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#0e2d27"
  }))), /*#__PURE__*/React.createElement("path", {
    d: ringD,
    fillRule: "evenodd",
    fill: solid || `url(#${uid})`
  }));
  if (variant === 'icon') {
    return /*#__PURE__*/React.createElement("span", {
      className: className,
      "aria-label": "360",
      style: {
        display: 'inline-flex',
        fontSize: size,
        lineHeight: 1,
        ...style
      }
    }, ring);
  }
  const digitsStyle = {
    fontFamily: 'var(--font-brand)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    ...(solid ? {
      color: solid
    } : {
      background: 'var(--gradient-brand)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    })
  };
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    "aria-label": "360",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: size,
      lineHeight: 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: digitsStyle
  }, "36"), ring);
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-avatar{
  --_s:40px; width:var(--_s); height:var(--_s); flex:none; border-radius:50%;
  display:inline-flex; align-items:center; justify-content:center; overflow:hidden;
  font-family:var(--font-sans); font-weight:600; color:#fff; background:var(--gradient-brand);
  font-size:calc(var(--_s) * 0.4); letter-spacing:0.01em; user-select:none; position:relative; }
.ds-avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.ds-avatar--xs{ --_s:24px; }
.ds-avatar--sm{ --_s:32px; }
.ds-avatar--lg{ --_s:56px; }
.ds-avatar--xl{ --_s:80px; }
.ds-avatar--ring{ box-shadow:0 0 0 2px var(--surface), 0 0 0 4px var(--teal-300); }
.ds-avatar--muted{ background:var(--neutral-300); color:var(--neutral-700); }
.ds-avatar-group{ display:inline-flex; }
.ds-avatar-group .ds-avatar{ box-shadow:0 0 0 2px var(--surface); margin-left:-10px; }
.ds-avatar-group .ds-avatar:first-child{ margin-left:0; }
.ds-avatar-group__more{ display:inline-flex; align-items:center; justify-content:center;
  border-radius:50%; background:var(--neutral-100); color:var(--text-secondary);
  font-family:var(--font-sans); font-weight:600; box-shadow:0 0 0 2px var(--surface); margin-left:-10px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-avatar-css')) {
  const s = document.createElement('style');
  s.id = 'ds-avatar-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/** User avatar — image or initials. */
function Avatar({
  name = '',
  src,
  size = 'md',
  ring = false,
  muted = false,
  className = '',
  ...rest
}) {
  const cls = ['ds-avatar', size !== 'md' && `ds-avatar--${size}`, ring && 'ds-avatar--ring', muted && 'ds-avatar--muted', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    title: name || undefined
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials(name));
}
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80
};

/** Overlapping stack of avatars with a "+N" overflow. */
function AvatarGroup({
  people = [],
  max = 4,
  size = 'md'
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const px = SIZES[size] || 40;
  return /*#__PURE__*/React.createElement("span", {
    className: "ds-avatar-group"
  }, shown.map((p, i) => /*#__PURE__*/React.createElement(Avatar, {
    key: i,
    name: p.name,
    src: p.src,
    size: size
  })), extra > 0 && /*#__PURE__*/React.createElement("span", {
    className: "ds-avatar-group__more",
    style: {
      width: px,
      height: px,
      fontSize: px * 0.36
    }
  }, "+", extra));
}
Object.assign(__ds_scope, { Avatar, AvatarGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-badge{
  display:inline-flex; align-items:center; gap:5px; font-family:var(--font-sans);
  font-size:12px; font-weight:600; line-height:1; letter-spacing:0.01em;
  padding:5px 10px; border-radius:var(--radius-full); white-space:nowrap; border:1px solid transparent; }
.ds-badge__dot{ width:6px; height:6px; border-radius:50%; background:currentColor; }
.ds-badge svg{ width:13px; height:13px; }
.ds-badge--neutral{ background:var(--neutral-100); color:var(--neutral-700); }
.ds-badge--brand{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-badge--success{ background:var(--success-100); color:var(--success-700); }
.ds-badge--warning{ background:var(--warning-100); color:var(--warning-700); }
.ds-badge--danger{ background:var(--danger-100); color:var(--danger-700); }
.ds-badge--gold{ background:var(--gold-100); color:var(--gold-600); }
.ds-badge--outline{ background:transparent; border-color:var(--border-strong); color:var(--text-secondary); }
.ds-badge--solid{ background:var(--brand); color:var(--on-brand); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-badge-css')) {
  const s = document.createElement('style');
  s.id = 'ds-badge-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Small status / category label. */
function Badge({
  tone = 'neutral',
  dot = false,
  icon,
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['ds-badge', `ds-badge--${tone}`, className].filter(Boolean).join(' ')
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "ds-badge__dot",
    "aria-hidden": "true"
  }), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-card{
  background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-sm); overflow:hidden;
  transition:box-shadow var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out),
             transform var(--duration-base) var(--ease-out); }
.ds-card--pad{ padding:22px; }
.ds-card--flat{ box-shadow:none; }
.ds-card--raised{ box-shadow:var(--shadow-md); }
.ds-card--interactive{ cursor:pointer; }
.ds-card--interactive:hover{ box-shadow:var(--shadow-lg); transform:translateY(-2px); border-color:var(--border-strong); }
.ds-card--dark{ background:var(--gradient-dark); border-color:transparent; color:var(--text-inverse); }
.ds-card--brand{ background:var(--gradient-brand); border-color:transparent; color:#fff; box-shadow:var(--shadow-brand); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-card-css')) {
  const s = document.createElement('style');
  s.id = 'ds-card-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Surface container. The default white card; also dark and brand-gradient variants. */
function Card({
  tone = 'default',
  padded = true,
  elevation = 'sm',
  interactive = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const cls = ['ds-card', padded && 'ds-card--pad', elevation === 'none' && 'ds-card--flat', elevation === 'md' && 'ds-card--raised', interactive && 'ds-card--interactive', tone === 'dark' && 'ds-card--dark', tone === 'brand' && 'ds-card--brand', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/ProgressBar.jsx
try { (() => {
const CSS = `
.ds-progress{ display:flex; flex-direction:column; gap:7px; font-family:var(--font-sans); width:100%; }
.ds-progress__head{ display:flex; justify-content:space-between; align-items:baseline; }
.ds-progress__label{ font-size:13px; font-weight:500; color:var(--text-secondary); white-space:nowrap; }
.ds-progress__val{ font-family:var(--font-mono); font-size:12px; color:var(--text-muted); }
.ds-progress__track{ height:8px; border-radius:var(--radius-full); background:var(--neutral-200); overflow:hidden; }
.ds-progress--lg .ds-progress__track{ height:12px; }
.ds-progress__fill{ height:100%; border-radius:inherit; background:var(--gradient-brand);
  transition:width 700ms var(--ease-out); }
.ds-progress__fill--gold{ background:linear-gradient(90deg, var(--gold-400), var(--gold-600)); }
.ds-progress__fill--success{ background:linear-gradient(90deg, var(--success-600), var(--success-700)); }
@media (prefers-reduced-motion: reduce){ .ds-progress__fill{ transition:none; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-progress-css')) {
  const s = document.createElement('style');
  s.id = 'ds-progress-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Linear progress / completion bar. */
function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = false,
  tone = 'brand',
  size = 'md',
  format,
  className = ''
}) {
  const pct = Math.max(0, Math.min(100, max ? value / max * 100 : 0));
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setW(pct);
      return;
    }
    const t = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  const valText = format ? format(value, max) : `${Math.round(pct)}%`;
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-progress', size === 'lg' && 'ds-progress--lg', className].filter(Boolean).join(' ')
  }, (label || showValue) && /*#__PURE__*/React.createElement("div", {
    className: "ds-progress__head"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ds-progress__label"
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    className: "ds-progress__val"
  }, valText)), /*#__PURE__*/React.createElement("div", {
    className: "ds-progress__track",
    role: "progressbar",
    "aria-valuenow": Math.round(pct),
    "aria-valuemin": 0,
    "aria-valuemax": 100
  }, /*#__PURE__*/React.createElement("div", {
    className: ['ds-progress__fill', tone !== 'brand' && `ds-progress__fill--${tone}`].filter(Boolean).join(' '),
    style: {
      width: `${w}%`
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/display/ScoreRing.jsx
try { (() => {
const CSS = `
.ds-ring{ display:inline-flex; flex-direction:column; align-items:center; gap:10px; font-family:var(--font-sans); }
.ds-ring__svg{ display:block; transform:rotate(-90deg); }
.ds-ring__track{ stroke:var(--neutral-200); }
.ds-ring__arc{ transition:stroke-dashoffset 900ms var(--ease-out); }
.ds-ring__center{ display:flex; flex-direction:column; align-items:center; line-height:1; }
.ds-ring__val{ font-weight:700; color:var(--text-primary); letter-spacing:-0.02em; }
.ds-ring__val small{ font-weight:500; color:var(--text-muted); }
.ds-ring__cap{ font-family:var(--font-mono); font-size:10px; letter-spacing:var(--tracking-caps);
  text-transform:uppercase; color:var(--text-muted); margin-top:4px; }
.ds-ring__label{ font-size:13px; color:var(--text-secondary); font-weight:500; }
.ds-ring--inverse .ds-ring__track{ stroke:rgba(255,255,255,0.16); }
.ds-ring--inverse .ds-ring__val{ color:#fff; }
.ds-ring--inverse .ds-ring__val small{ color:rgba(255,255,255,0.6); }
.ds-ring--inverse .ds-ring__cap,.ds-ring--inverse .ds-ring__label{ color:rgba(255,255,255,0.7); }
@media (prefers-reduced-motion: reduce){ .ds-ring__arc{ transition:none; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-ring-css')) {
  const s = document.createElement('style');
  s.id = 'ds-ring-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const STROKES = {
  brand: ['#4a9082', '#236054', '#0e2d27'],
  gold: ['#d8b87c', '#c79f5a', '#b3863f'],
  success: ['#4fae7d', '#2c8a58', '#1f6e44']
};

/** The 360° score donut. Sweeps an arc to value/max on mount. */
function ScoreRing({
  value = 0,
  max = 5,
  size = 120,
  thickness,
  tone = 'brand',
  inverse = false,
  label,
  caption,
  format,
  className = ''
}) {
  const uid = React.useMemo(() => 'sr' + Math.random().toString(36).slice(2, 8), []);
  const sw = thickness || Math.round(size * 0.1);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const [off, setOff] = React.useState(c);
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setOff(c * (1 - pct));
      return;
    }
    const t = requestAnimationFrame(() => setOff(c * (1 - pct)));
    return () => cancelAnimationFrame(t);
  }, [c, pct]);
  const stops = inverse && tone === 'brand' ? ['#9fccc1', '#5aa492', '#3d8a7a'] : STROKES[tone] || STROKES.brand;
  const display = format ? format(value) : Number.isInteger(value) ? value : value.toFixed(1);
  const fs = size * 0.3;
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-ring', inverse && 'ds-ring--inverse', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "ds-ring__svg",
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: uid,
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: stops[0]
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "55%",
    stopColor: stops[1]
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: stops[2]
  }))), /*#__PURE__*/React.createElement("circle", {
    className: "ds-ring__track",
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    strokeWidth: sw
  }), /*#__PURE__*/React.createElement("circle", {
    className: "ds-ring__arc",
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: `url(#${uid})`,
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: off
  })), /*#__PURE__*/React.createElement("div", {
    className: "ds-ring__center",
    style: {
      position: 'absolute',
      inset: 0,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ds-ring__val",
    style: {
      fontSize: fs
    }
  }, display, max && !format && /*#__PURE__*/React.createElement("small", {
    style: {
      fontSize: fs * 0.45
    }
  }, "/", max)), caption && /*#__PURE__*/React.createElement("span", {
    className: "ds-ring__cap"
  }, caption))), label && /*#__PURE__*/React.createElement("span", {
    className: "ds-ring__label"
  }, label));
}
Object.assign(__ds_scope, { ScoreRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/ScoreRing.jsx", error: String((e && e.message) || e) }); }

// components/display/Stat.jsx
try { (() => {
const CSS = `
.ds-stat{ display:flex; flex-direction:column; gap:4px; font-family:var(--font-sans); }
.ds-stat__label{ font-family:var(--font-mono); font-size:10.5px; letter-spacing:var(--tracking-caps);
  text-transform:uppercase; color:var(--text-muted); }
.ds-stat__value{ font-size:30px; font-weight:700; color:var(--text-primary); letter-spacing:-0.02em; line-height:1.05; }
.ds-stat__value small{ font-size:0.5em; font-weight:600; color:var(--text-muted); margin-left:2px; }
.ds-stat__delta{ display:inline-flex; align-items:center; gap:3px; font-size:12.5px; font-weight:600; margin-top:2px; }
.ds-stat__delta svg{ width:13px; height:13px; }
.ds-stat__delta--up{ color:var(--success-700); }
.ds-stat__delta--down{ color:var(--danger-700); }
.ds-stat__delta--flat{ color:var(--text-muted); }
.ds-stat--inverse .ds-stat__label{ color:rgba(255,255,255,0.6); }
.ds-stat--inverse .ds-stat__value{ color:#fff; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-stat-css')) {
  const s = document.createElement('style');
  s.id = 'ds-stat-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const Arrow = ({
  dir
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.4",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, dir === 'up' ? /*#__PURE__*/React.createElement("path", {
  d: "M12 19V5M5 12l7-7 7 7"
}) : dir === 'down' ? /*#__PURE__*/React.createElement("path", {
  d: "M12 5v14M5 12l7 7 7-7"
}) : /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}));

/** Compact metric — label, big value, optional delta. */
function Stat({
  label,
  value,
  unit,
  delta,
  deltaDir,
  inverse = false,
  className = ''
}) {
  const dir = deltaDir || (typeof delta === 'number' ? delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' : 'flat');
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-stat', inverse && 'ds-stat--inverse', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ds-stat__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "ds-stat__value"
  }, value, unit && /*#__PURE__*/React.createElement("small", null, unit)), delta != null && /*#__PURE__*/React.createElement("span", {
    className: `ds-stat__delta ds-stat__delta--${dir}`
  }, /*#__PURE__*/React.createElement(Arrow, {
    dir: dir
  }), typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}` : delta));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Stat.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-tag{
  display:inline-flex; align-items:center; gap:6px; font-family:var(--font-sans);
  font-size:13px; font-weight:500; color:var(--text-secondary);
  background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--radius-full);
  padding:5px 12px; white-space:nowrap;
  transition:background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out),
             color var(--duration-fast) var(--ease-out); }
.ds-tag--selected{ background:var(--brand-subtle); border-color:var(--teal-300); color:var(--text-brand); }
.ds-tag--clickable{ cursor:pointer; }
.ds-tag--clickable:hover{ border-color:var(--neutral-400); }
.ds-tag__x{ display:inline-flex; cursor:pointer; color:var(--text-muted); margin:-2px -4px -2px 0;
  border-radius:50%; padding:2px; }
.ds-tag__x:hover{ color:var(--text-primary); background:var(--neutral-100); }
.ds-tag__x svg{ width:13px; height:13px; display:block; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-tag-css')) {
  const s = document.createElement('style');
  s.id = 'ds-tag-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const X = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.4",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M18 6 6 18M6 6l12 12"
}));

/** Filter / keyword chip, optionally selectable or removable. */
function Tag({
  selected = false,
  onRemove,
  onClick,
  icon,
  className = '',
  children,
  ...rest
}) {
  const clickable = !!onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['ds-tag', selected && 'ds-tag--selected', clickable && 'ds-tag--clickable', className].filter(Boolean).join(' '),
    onClick: onClick
  }, rest), icon, children, onRemove && /*#__PURE__*/React.createElement("span", {
    className: "ds-tag__x",
    role: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove();
    }
  }, /*#__PURE__*/React.createElement(X, null)));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
const CSS = `
.ds-dialog__scrim{ position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center;
  padding:24px; background:rgba(14,13,11,0.5); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  animation:ds-dialog-fade var(--duration-base) var(--ease-out); }
.ds-dialog{ position:relative; width:100%; max-width:480px; background:var(--surface);
  border-radius:var(--radius-xl); box-shadow:var(--shadow-xl); overflow:hidden;
  animation:ds-dialog-rise var(--duration-slow) var(--ease-out); max-height:calc(100vh - 48px);
  display:flex; flex-direction:column; }
.ds-dialog--sm{ max-width:380px; } .ds-dialog--lg{ max-width:640px; }
.ds-dialog__head{ display:flex; align-items:flex-start; gap:16px; padding:24px 24px 0; }
.ds-dialog__titles{ flex:1; }
.ds-dialog__title{ font-size:19px; font-weight:700; letter-spacing:var(--tracking-snug); margin:0; color:var(--text-primary); }
.ds-dialog__desc{ font-size:14px; color:var(--text-secondary); margin:6px 0 0; line-height:var(--leading-normal); }
.ds-dialog__x{ flex:none; display:inline-flex; padding:6px; margin:-6px -6px 0 0; border:0; background:transparent;
  color:var(--text-muted); border-radius:var(--radius-sm); cursor:pointer; }
.ds-dialog__x:hover{ background:var(--neutral-100); color:var(--text-primary); }
.ds-dialog__x svg{ width:18px; height:18px; }
.ds-dialog__body{ padding:18px 24px; overflow:auto; }
.ds-dialog__foot{ display:flex; justify-content:flex-end; gap:10px; padding:16px 24px 24px;
  border-top:1px solid var(--divider); margin-top:auto; }
@keyframes ds-dialog-fade{ from{ opacity:0 } to{ opacity:1 } }
@keyframes ds-dialog-rise{ from{ opacity:0; transform:translateY(12px) scale(0.98) } to{ opacity:1; transform:none } }
@media (prefers-reduced-motion: reduce){ .ds-dialog,.ds-dialog__scrim{ animation:none } }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-dialog-css')) {
  const s = document.createElement('style');
  s.id = 'ds-dialog-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Modal dialog with scrim + blur. Render conditionally on `open`. */
function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  className = '',
  children
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "ds-dialog__scrim",
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: ['ds-dialog', size !== 'md' && `ds-dialog--${size}`, className].filter(Boolean).join(' '),
    role: "dialog",
    "aria-modal": "true"
  }, (title || onClose) && /*#__PURE__*/React.createElement("div", {
    className: "ds-dialog__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-dialog__titles"
  }, title && /*#__PURE__*/React.createElement("h2", {
    className: "ds-dialog__title"
  }, title), description && /*#__PURE__*/React.createElement("p", {
    className: "ds-dialog__desc"
  }, description)), onClose && /*#__PURE__*/React.createElement("button", {
    className: "ds-dialog__x",
    "aria-label": "Close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), children && /*#__PURE__*/React.createElement("div", {
    className: "ds-dialog__body"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "ds-dialog__foot"
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const CSS = `
.ds-toast{ display:flex; align-items:flex-start; gap:12px; width:100%; max-width:380px;
  background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md);
  box-shadow:var(--shadow-lg); padding:14px 14px 14px 16px; font-family:var(--font-sans);
  border-left:3px solid var(--brand);
  animation:ds-toast-in var(--duration-slow) var(--ease-out); }
.ds-toast--success{ border-left-color:var(--success-600); }
.ds-toast--warning{ border-left-color:var(--warning-600); }
.ds-toast--danger{ border-left-color:var(--danger-600); }
.ds-toast__icon{ flex:none; display:inline-flex; margin-top:1px; color:var(--brand); }
.ds-toast--success .ds-toast__icon{ color:var(--success-600); }
.ds-toast--warning .ds-toast__icon{ color:var(--warning-600); }
.ds-toast--danger .ds-toast__icon{ color:var(--danger-600); }
.ds-toast__icon svg{ width:18px; height:18px; }
.ds-toast__body{ flex:1; min-width:0; }
.ds-toast__title{ font-size:14px; font-weight:600; color:var(--text-primary); }
.ds-toast__desc{ font-size:13px; color:var(--text-secondary); margin-top:2px; line-height:1.45; }
.ds-toast__x{ flex:none; border:0; background:transparent; color:var(--text-muted); cursor:pointer;
  padding:2px; border-radius:var(--radius-sm); margin:-2px -2px 0 0; }
.ds-toast__x:hover{ color:var(--text-primary); }
.ds-toast__x svg{ width:15px; height:15px; display:block; }
.ds-toast-viewport{ position:fixed; bottom:24px; right:24px; z-index:1100;
  display:flex; flex-direction:column; gap:10px; }
@keyframes ds-toast-in{ from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:none } }
@media (prefers-reduced-motion: reduce){ .ds-toast{ animation:none } }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-toast-css')) {
  const s = document.createElement('style');
  s.id = 'ds-toast-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const ICONS = {
  default: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  success: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  warning: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  danger: 'M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'
};

/** Notification toast. Position multiple inside ToastViewport. */
function Toast({
  tone = 'default',
  title,
  children,
  onClose,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-toast', tone !== 'default' && `ds-toast--${tone}`, className].filter(Boolean).join(' '),
    role: "status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ds-toast__icon"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: ICONS[tone] || ICONS.default
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ds-toast__body"
  }, title && /*#__PURE__*/React.createElement("div", {
    className: "ds-toast__title"
  }, title), children && /*#__PURE__*/React.createElement("div", {
    className: "ds-toast__desc"
  }, children)), onClose && /*#__PURE__*/React.createElement("button", {
    className: "ds-toast__x",
    "aria-label": "Dismiss",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}

/** Fixed bottom-right stack for toasts. */
function ToastViewport({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ds-toast-viewport"
  }, children);
}
Object.assign(__ds_scope, { Toast, ToastViewport });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
const CSS = `
.ds-tip{ position:relative; display:inline-flex; }
.ds-tip__pop{ position:absolute; z-index:1200; pointer-events:none; white-space:nowrap;
  background:var(--neutral-900); color:#fff; font-family:var(--font-sans); font-size:12.5px; font-weight:500;
  padding:6px 10px; border-radius:var(--radius-sm); box-shadow:var(--shadow-md);
  opacity:0; transform:translateY(2px) scale(0.98); transform-origin:center;
  transition:opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.ds-tip__pop::after{ content:""; position:absolute; width:7px; height:7px; background:inherit; transform:rotate(45deg); }
.ds-tip:hover .ds-tip__pop, .ds-tip:focus-within .ds-tip__pop{ opacity:1; transform:translateY(0) scale(1); }
.ds-tip__pop--top{ bottom:calc(100% + 8px); left:50%; translate:-50% 0; }
.ds-tip__pop--top::after{ bottom:-3px; left:50%; margin-left:-3.5px; }
.ds-tip__pop--bottom{ top:calc(100% + 8px); left:50%; translate:-50% 0; }
.ds-tip__pop--bottom::after{ top:-3px; left:50%; margin-left:-3.5px; }
.ds-tip__pop--left{ right:calc(100% + 8px); top:50%; translate:0 -50%; }
.ds-tip__pop--left::after{ right:-3px; top:50%; margin-top:-3.5px; }
.ds-tip__pop--right{ left:calc(100% + 8px); top:50%; translate:0 -50%; }
.ds-tip__pop--right::after{ left:-3px; top:50%; margin-top:-3.5px; }
@media (prefers-reduced-motion: reduce){ .ds-tip__pop{ transition:opacity var(--duration-fast) linear; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-tooltip-css')) {
  const s = document.createElement('style');
  s.id = 'ds-tooltip-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Hover/focus tooltip wrapping a trigger element. */
function Tooltip({
  content,
  side = 'top',
  className = '',
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: ['ds-tip', className].filter(Boolean).join(' '),
    tabIndex: 0
  }, children, /*#__PURE__*/React.createElement("span", {
    className: `ds-tip__pop ds-tip__pop--${side}`,
    role: "tooltip"
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-btn{
  --_h:40px; --_px:18px; --_fs:14px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  height:var(--_h); padding:0 var(--_px); font-size:var(--_fs);
  font-family:var(--font-sans); font-weight:600; letter-spacing:var(--tracking-snug);
  border-radius:var(--radius-md); border:1px solid transparent; cursor:pointer;
  text-decoration:none; white-space:nowrap; user-select:none;
  transition:background var(--duration-fast) var(--ease-out),
             border-color var(--duration-fast) var(--ease-out),
             box-shadow var(--duration-fast) var(--ease-out),
             transform var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}
.ds-btn:focus-visible{ outline:none; box-shadow:var(--focus-ring); }
.ds-btn:active{ transform:translateY(0.5px) scale(0.99); }
.ds-btn[disabled],.ds-btn[aria-disabled="true"]{ opacity:0.45; pointer-events:none; box-shadow:none; }
.ds-btn--sm{ --_h:34px; --_px:14px; --_fs:13px; border-radius:var(--radius-sm); }
.ds-btn--lg{ --_h:48px; --_px:24px; --_fs:16px; }
.ds-btn--block{ display:flex; width:100%; }
.ds-btn__icon{ display:inline-flex; }
.ds-btn__icon svg{ width:1.15em; height:1.15em; display:block; }

.ds-btn--primary{ background:var(--brand); color:var(--on-brand); box-shadow:var(--shadow-brand); }
.ds-btn--primary:hover{ background:var(--brand-hover); }
.ds-btn--primary:active{ background:var(--brand-active); }

.ds-btn--secondary{ background:var(--surface); color:var(--text-primary); border-color:var(--border-strong); box-shadow:var(--shadow-xs); }
.ds-btn--secondary:hover{ background:var(--surface-sunken); border-color:var(--neutral-400); }

.ds-btn--subtle{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-btn--subtle:hover{ background:var(--brand-subtle-hover); }

.ds-btn--ghost{ background:transparent; color:var(--text-secondary); }
.ds-btn--ghost:hover{ background:var(--brand-subtle); color:var(--text-brand); }

.ds-btn--danger{ background:var(--danger-600); color:#fff; }
.ds-btn--danger:hover{ background:var(--danger-700); }

.ds-btn--inverse{ background:#fff; color:var(--teal-800); }
.ds-btn--inverse:hover{ background:var(--neutral-100); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-button-css')) {
  const s = document.createElement('style');
  s.id = 'ds-button-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Primary action control for 360. */
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  as = 'button',
  href,
  type = 'button',
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ds-btn', `ds-btn--${variant}`, size !== 'md' && `ds-btn--${size}`, fullWidth && 'ds-btn--block', className].filter(Boolean).join(' ');
  const inner = /*#__PURE__*/React.createElement(React.Fragment, null, iconLeft && /*#__PURE__*/React.createElement("span", {
    className: "ds-btn__icon"
  }, iconLeft), children && /*#__PURE__*/React.createElement("span", null, children), iconRight && /*#__PURE__*/React.createElement("span", {
    className: "ds-btn__icon"
  }, iconRight));
  if (as === 'a') {
    return /*#__PURE__*/React.createElement("a", _extends({
      className: cls,
      href: href,
      "aria-disabled": disabled || undefined
    }, rest), inner);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    type: type,
    disabled: disabled
  }, rest), inner);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-check{ display:inline-flex; align-items:flex-start; gap:10px; font-family:var(--font-sans);
  cursor:pointer; user-select:none; }
.ds-check input{ position:absolute; opacity:0; width:0; height:0; }
.ds-check__box{
  width:20px; height:20px; flex:none; margin-top:1px; border-radius:6px;
  border:1.5px solid var(--border-strong); background:var(--surface); color:#fff;
  display:inline-flex; align-items:center; justify-content:center;
  transition:background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
}
.ds-check__box svg{ width:13px; height:13px; opacity:0; transform:scale(0.6);
  transition:opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.ds-check input:checked + .ds-check__box{ background:var(--brand); border-color:var(--brand); }
.ds-check input:checked + .ds-check__box svg{ opacity:1; transform:scale(1); }
.ds-check input:focus-visible + .ds-check__box{ box-shadow:var(--focus-ring); }
.ds-check input:disabled + .ds-check__box{ opacity:0.5; }
.ds-check--disabled{ cursor:not-allowed; opacity:0.7; }
.ds-check__text{ display:flex; flex-direction:column; gap:2px; }
.ds-check__label{ font-size:14px; color:var(--text-primary); line-height:1.35; }
.ds-check__desc{ font-size:12.5px; color:var(--text-muted); line-height:1.4; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-checkbox-css')) {
  const s = document.createElement('style');
  s.id = 'ds-checkbox-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Checkbox with optional label and description. */
function Checkbox({
  label,
  description,
  checked,
  disabled = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: ['ds-check', disabled && 'ds-check--disabled', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "ds-check__box",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), (label || description) && /*#__PURE__*/React.createElement("span", {
    className: "ds-check__text"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ds-check__label"
  }, label), description && /*#__PURE__*/React.createElement("span", {
    className: "ds-check__desc"
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-iconbtn{
  --_s:40px;
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s); height:var(--_s); flex:none; padding:0; cursor:pointer;
  border-radius:var(--radius-md); border:1px solid transparent; color:var(--text-secondary);
  background:transparent;
  transition:background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out),
             border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-iconbtn svg{ width:1.2em; height:1.2em; display:block; }
.ds-iconbtn{ font-size:18px; }
.ds-iconbtn--sm{ --_s:32px; font-size:16px; border-radius:var(--radius-sm); }
.ds-iconbtn--lg{ --_s:48px; font-size:20px; }
.ds-iconbtn:focus-visible{ outline:none; box-shadow:var(--focus-ring); }
.ds-iconbtn:active{ transform:scale(0.94); }
.ds-iconbtn[disabled]{ opacity:0.4; pointer-events:none; }

.ds-iconbtn--ghost:hover{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-iconbtn--subtle{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-iconbtn--subtle:hover{ background:var(--brand-subtle-hover); }
.ds-iconbtn--outline{ border-color:var(--border-strong); color:var(--text-secondary); background:var(--surface); }
.ds-iconbtn--outline:hover{ background:var(--surface-sunken); }
.ds-iconbtn--solid{ background:var(--brand); color:var(--on-brand); }
.ds-iconbtn--solid:hover{ background:var(--brand-hover); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-iconbtn-css')) {
  const s = document.createElement('style');
  s.id = 'ds-iconbtn-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Square, icon-only button. Always pass an accessible label. */
function IconButton({
  variant = 'ghost',
  size = 'md',
  label,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ds-iconbtn', `ds-iconbtn--${variant}`, size !== 'md' && `ds-iconbtn--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-field{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.ds-field__label{ font-size:13px; font-weight:600; color:var(--text-primary); letter-spacing:var(--tracking-snug); }
.ds-field__req{ color:var(--danger-600); margin-left:2px; }
.ds-field__wrap{
  display:flex; align-items:center; gap:8px; background:var(--surface);
  border:1px solid var(--border-strong); border-radius:var(--radius-md);
  padding:0 12px; height:42px;
  transition:border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-field__wrap:focus-within{ border-color:var(--focus-color); box-shadow:var(--focus-ring); }
.ds-field__wrap--err{ border-color:var(--danger-600); }
.ds-field__wrap--err:focus-within{ box-shadow:0 0 0 3px rgba(179,74,60,0.22); }
.ds-field__wrap--disabled{ background:var(--surface-sunken); opacity:0.7; pointer-events:none; }
.ds-field__icon{ display:inline-flex; color:var(--text-muted); font-size:17px; }
.ds-field__icon svg{ width:1.05em; height:1.05em; display:block; }
.ds-field__input{
  flex:1; min-width:0; border:0; outline:none; background:transparent;
  font-family:inherit; font-size:14.5px; color:var(--text-primary); height:100%;
}
.ds-field__input::placeholder{ color:var(--text-muted); }
.ds-field__msg{ font-size:12px; color:var(--text-muted); }
.ds-field__msg--err{ color:var(--danger-700); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-field-css')) {
  const s = document.createElement('style');
  s.id = 'ds-field-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Labelled text input with optional icons, hint and error. */
function Input({
  label,
  hint,
  error,
  required = false,
  iconLeft,
  iconRight,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  const fid = id || React.useId();
  const wrapCls = ['ds-field__wrap', error && 'ds-field__wrap--err', disabled && 'ds-field__wrap--disabled'].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-field', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ds-field__label",
    htmlFor: fid
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "ds-field__req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: wrapCls
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    className: "ds-field__icon"
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    className: "ds-field__input",
    id: fid,
    disabled: disabled,
    "aria-invalid": !!error
  }, rest)), iconRight && /*#__PURE__*/React.createElement("span", {
    className: "ds-field__icon"
  }, iconRight)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: ['ds-field__msg', error && 'ds-field__msg--err'].filter(Boolean).join(' ')
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-radio{ display:inline-flex; align-items:flex-start; gap:10px; font-family:var(--font-sans);
  cursor:pointer; user-select:none; }
.ds-radio input{ position:absolute; opacity:0; width:0; height:0; }
.ds-radio__dot{
  width:20px; height:20px; flex:none; margin-top:1px; border-radius:50%;
  border:1.5px solid var(--border-strong); background:var(--surface);
  display:inline-flex; align-items:center; justify-content:center;
  transition:border-color var(--duration-fast) var(--ease-out); }
.ds-radio__dot::after{ content:""; width:9px; height:9px; border-radius:50%; background:var(--brand);
  transform:scale(0); transition:transform var(--duration-fast) var(--ease-out); }
.ds-radio input:checked + .ds-radio__dot{ border-color:var(--brand); }
.ds-radio input:checked + .ds-radio__dot::after{ transform:scale(1); }
.ds-radio input:focus-visible + .ds-radio__dot{ box-shadow:var(--focus-ring); }
.ds-radio input:disabled + .ds-radio__dot{ opacity:0.5; }
.ds-radio--card{ border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 14px;
  background:var(--surface); transition:border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out); }
.ds-radio--card:hover{ border-color:var(--border-strong); }
.ds-radio--card:has(input:checked){ border-color:var(--brand); background:var(--brand-subtle); }
.ds-radio__text{ display:flex; flex-direction:column; gap:2px; }
.ds-radio__label{ font-size:14px; color:var(--text-primary); line-height:1.35; }
.ds-radio__desc{ font-size:12.5px; color:var(--text-muted); line-height:1.4; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-radio-css')) {
  const s = document.createElement('style');
  s.id = 'ds-radio-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Single radio option. Group by sharing a `name`. Use `card` for selectable tiles. */
function Radio({
  label,
  description,
  card = false,
  disabled = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: ['ds-radio', card && 'ds-radio--card', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "ds-radio__dot",
    "aria-hidden": "true"
  }), (label || description) && /*#__PURE__*/React.createElement("span", {
    className: "ds-radio__text"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ds-radio__label"
  }, label), description && /*#__PURE__*/React.createElement("span", {
    className: "ds-radio__desc"
  }, description)));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/RatingScale.jsx
try { (() => {
const CSS = `
.ds-rating{ display:flex; flex-direction:column; gap:8px; font-family:var(--font-sans); }
.ds-rating__scale{ display:flex; gap:8px; }
.ds-rating__btn{
  flex:1; min-width:0; height:44px; border-radius:var(--radius-md);
  border:1.5px solid var(--border); background:var(--surface); cursor:pointer;
  font-family:var(--font-mono); font-size:15px; font-weight:500; color:var(--text-secondary);
  display:inline-flex; align-items:center; justify-content:center;
  transition:border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out),
             color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.ds-rating__btn:hover{ border-color:var(--teal-300); color:var(--text-brand); }
.ds-rating__btn:focus-visible{ outline:none; box-shadow:var(--focus-ring); }
.ds-rating__btn[aria-pressed="true"]{ background:var(--brand); border-color:var(--brand); color:var(--on-brand); }
.ds-rating__btn[aria-pressed="true"]:hover{ background:var(--brand-hover); color:#fff; }
.ds-rating__ends{ display:flex; justify-content:space-between; }
.ds-rating__end{ font-size:12px; color:var(--text-muted); }
.ds-rating--na .ds-rating__btn:last-child{ flex:0 0 auto; padding:0 14px; font-family:var(--font-sans); font-size:13px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-rating-css')) {
  const s = document.createElement('style');
  s.id = 'ds-rating-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Segmented 1..max rating scale used in 360 surveys. Controlled via value/onChange(n). */
function RatingScale({
  max = 5,
  value,
  onChange,
  minLabel = 'Strongly disagree',
  maxLabel = 'Strongly agree',
  allowNA = false,
  className = ''
}) {
  const items = Array.from({
    length: max
  }, (_, i) => i + 1);
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-rating', allowNA && 'ds-rating--na', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-rating__scale"
  }, items.map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    type: "button",
    className: "ds-rating__btn",
    "aria-pressed": value === n,
    onClick: () => onChange && onChange(n)
  }, n)), allowNA && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ds-rating__btn",
    "aria-pressed": value === 'na',
    onClick: () => onChange && onChange('na')
  }, "N/A")), (minLabel || maxLabel) && /*#__PURE__*/React.createElement("div", {
    className: "ds-rating__ends"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ds-rating__end"
  }, minLabel), /*#__PURE__*/React.createElement("span", {
    className: "ds-rating__end"
  }, maxLabel)));
}
Object.assign(__ds_scope, { RatingScale });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RatingScale.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-sel{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.ds-sel__label{ font-size:13px; font-weight:600; color:var(--text-primary); }
.ds-sel__wrap{ position:relative; display:flex; align-items:center; }
.ds-sel__el{
  appearance:none; -webkit-appearance:none; width:100%; height:42px;
  font-family:inherit; font-size:14.5px; color:var(--text-primary);
  background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--radius-md);
  padding:0 38px 0 13px; cursor:pointer; outline:none;
  transition:border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-sel__el:focus{ border-color:var(--focus-color); box-shadow:var(--focus-ring); }
.ds-sel__el:disabled{ background:var(--surface-sunken); opacity:0.7; cursor:not-allowed; }
.ds-sel__el[data-placeholder="true"]{ color:var(--text-muted); }
.ds-sel__chev{ position:absolute; right:13px; pointer-events:none; color:var(--text-muted);
  display:inline-flex; }
.ds-sel__chev svg{ width:16px; height:16px; display:block; }
.ds-sel__msg{ font-size:12px; color:var(--text-muted); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-select-css')) {
  const s = document.createElement('style');
  s.id = 'ds-select-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const Chevron = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "m6 9 6 6 6-6"
}));

/** Styled native select. Pass options as [{value,label}] or use children <option>s. */
function Select({
  label,
  hint,
  options,
  placeholder,
  value,
  id,
  className = '',
  children,
  ...rest
}) {
  const fid = id || React.useId();
  const isPlaceholder = placeholder && (value === '' || value == null);
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-sel', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ds-sel__label",
    htmlFor: fid
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "ds-sel__wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    className: "ds-sel__el",
    id: fid,
    value: value,
    "data-placeholder": isPlaceholder || undefined
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options ? options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)) : children), /*#__PURE__*/React.createElement("span", {
    className: "ds-sel__chev"
  }, /*#__PURE__*/React.createElement(Chevron, null))), hint && /*#__PURE__*/React.createElement("span", {
    className: "ds-sel__msg"
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-switch{ display:inline-flex; align-items:center; gap:10px; font-family:var(--font-sans);
  cursor:pointer; user-select:none; }
.ds-switch input{ position:absolute; opacity:0; width:0; height:0; }
.ds-switch__track{
  width:42px; height:24px; flex:none; border-radius:var(--radius-full);
  background:var(--neutral-300); position:relative;
  transition:background var(--duration-base) var(--ease-out); }
.ds-switch__track::after{ content:""; position:absolute; top:2px; left:2px; width:20px; height:20px;
  border-radius:50%; background:#fff; box-shadow:var(--shadow-sm);
  transition:transform var(--duration-base) var(--ease-out); }
.ds-switch input:checked + .ds-switch__track{ background:var(--brand); }
.ds-switch input:checked + .ds-switch__track::after{ transform:translateX(18px); }
.ds-switch input:focus-visible + .ds-switch__track{ box-shadow:var(--focus-ring); }
.ds-switch input:disabled + .ds-switch__track{ opacity:0.5; }
.ds-switch--sm .ds-switch__track{ width:34px; height:20px; }
.ds-switch--sm .ds-switch__track::after{ width:16px; height:16px; }
.ds-switch--sm input:checked + .ds-switch__track::after{ transform:translateX(14px); }
.ds-switch__label{ font-size:14px; color:var(--text-primary); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-switch-css')) {
  const s = document.createElement('style');
  s.id = 'ds-switch-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** On/off toggle. */
function Switch({
  label,
  size = 'md',
  checked,
  disabled = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: ['ds-switch', size === 'sm' && 'ds-switch--sm', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "ds-switch__track",
    "aria-hidden": "true"
  }), label && /*#__PURE__*/React.createElement("span", {
    className: "ds-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.ds-ta{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.ds-ta__label{ font-size:13px; font-weight:600; color:var(--text-primary); }
.ds-ta__req{ color:var(--danger-600); margin-left:2px; }
.ds-ta__box{
  border:1px solid var(--border-strong); border-radius:var(--radius-md); background:var(--surface);
  font-family:inherit; font-size:14.5px; line-height:var(--leading-normal); color:var(--text-primary);
  padding:11px 13px; resize:vertical; min-height:96px; outline:none;
  transition:border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-ta__box::placeholder{ color:var(--text-muted); }
.ds-ta__box:focus{ border-color:var(--focus-color); box-shadow:var(--focus-ring); }
.ds-ta__box--err{ border-color:var(--danger-600); }
.ds-ta__row{ display:flex; justify-content:space-between; gap:10px; }
.ds-ta__msg{ font-size:12px; color:var(--text-muted); }
.ds-ta__msg--err{ color:var(--danger-700); }
.ds-ta__count{ font-size:12px; color:var(--text-muted); font-family:var(--font-mono); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-textarea-css')) {
  const s = document.createElement('style');
  s.id = 'ds-textarea-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Multi-line text input — feedback prompts, notes. */
function Textarea({
  label,
  hint,
  error,
  required = false,
  maxLength,
  value,
  id,
  className = '',
  ...rest
}) {
  const fid = id || React.useId();
  const count = typeof value === 'string' ? value.length : null;
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-ta', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ds-ta__label",
    htmlFor: fid
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "ds-ta__req"
  }, "*")), /*#__PURE__*/React.createElement("textarea", _extends({
    className: ['ds-ta__box', error && 'ds-ta__box--err'].filter(Boolean).join(' '),
    id: fid,
    maxLength: maxLength,
    value: value,
    "aria-invalid": !!error
  }, rest)), /*#__PURE__*/React.createElement("div", {
    className: "ds-ta__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: ['ds-ta__msg', error && 'ds-ta__msg--err'].filter(Boolean).join(' ')
  }, error || hint || ''), maxLength && count != null && /*#__PURE__*/React.createElement("span", {
    className: "ds-ta__count"
  }, count, "/", maxLength)));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const CSS = `
.ds-tabs{ font-family:var(--font-sans); }
.ds-tabs__list{ display:inline-flex; gap:4px; }
.ds-tabs--underline .ds-tabs__list{ gap:24px; border-bottom:1px solid var(--border); width:100%; }
.ds-tab{ position:relative; display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  font-family:inherit; font-size:14px; font-weight:600; color:var(--text-secondary);
  background:transparent; border:0; padding:10px 2px;
  transition:color var(--duration-fast) var(--ease-out); }
.ds-tab svg{ width:16px; height:16px; }
.ds-tab:hover{ color:var(--text-primary); }
.ds-tab[aria-selected="true"]{ color:var(--text-brand); }
.ds-tabs--underline .ds-tab::after{ content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px;
  background:var(--brand); border-radius:2px; transform:scaleX(0);
  transition:transform var(--duration-base) var(--ease-out); }
.ds-tabs--underline .ds-tab[aria-selected="true"]::after{ transform:scaleX(1); }
.ds-tabs--pill .ds-tabs__list{ background:var(--surface-sunken); padding:4px; border-radius:var(--radius-md);
  border:1px solid var(--border); }
.ds-tabs--pill .ds-tab{ padding:7px 14px; border-radius:var(--radius-sm); }
.ds-tabs--pill .ds-tab[aria-selected="true"]{ background:var(--surface); color:var(--text-brand);
  box-shadow:var(--shadow-xs); }
.ds-tab__count{ font-family:var(--font-mono); font-size:11px; color:var(--text-muted);
  background:var(--neutral-100); border-radius:var(--radius-full); padding:1px 7px; }
.ds-tab[aria-selected="true"] .ds-tab__count{ background:var(--brand-subtle); color:var(--text-brand); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ds-tabs-css')) {
  const s = document.createElement('style');
  s.id = 'ds-tabs-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Tab navigation. items: [{value,label,icon?,count?}]. Controlled via value/onChange. */
function Tabs({
  items = [],
  value,
  onChange,
  variant = 'underline',
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['ds-tabs', `ds-tabs--${variant}`, className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-tabs__list",
    role: "tablist"
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.value,
    type: "button",
    role: "tab",
    className: "ds-tab",
    "aria-selected": value === it.value,
    onClick: () => onChange && onChange(it.value)
  }, it.icon, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
    className: "ds-tab__count"
  }, it.count)))));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppScreens.jsx
try { (() => {
/* 360 — App UI kit · screens. Loaded after AppShell.jsx. Exports window.AppKit. */

const DS = window.Ds360GrowthDesignSystem_39b0a1;
const {
  Card,
  Button,
  IconButton,
  Badge,
  Tag,
  Avatar,
  AvatarGroup,
  ScoreRing,
  ProgressBar,
  Stat,
  Tabs,
  RatingScale,
  Textarea,
  Input,
  Select,
  Switch,
  Radio,
  Checkbox,
  Toast,
  ToastViewport,
  Logo,
  Dialog
} = DS;
const Icon = window.Icon,
  Sidebar = window.Sidebar,
  Topbar = window.Topbar,
  Eyebrow = window.Eyebrow;
const PEOPLE = [{
  name: 'Ana Reed'
}, {
  name: 'Jon Diaz'
}, {
  name: 'Mia Lee'
}, {
  name: 'Sam Roe'
}, {
  name: 'Ko Park'
}, {
  name: 'Lena Fox'
}, {
  name: 'Ravi Nair'
}, {
  name: 'Tess Adler'
}, {
  name: 'Will Yu'
}];

/* ============================ DASHBOARD ============================ */
function Dashboard({
  onNav
}) {
  const reviews = [{
    id: 1,
    name: 'My leadership 360',
    status: 'complete',
    score: 4.6,
    resp: 9,
    total: 9,
    when: 'Completed 2 days ago'
  }, {
    id: 2,
    name: 'Q2 self-awareness check',
    status: 'active',
    score: null,
    resp: 7,
    total: 10,
    when: 'Closes in 4 days'
  }, {
    id: 3,
    name: 'Client — Dana (CEO, Northwind)',
    status: 'active',
    score: null,
    resp: 3,
    total: 8,
    when: 'Closes in 9 days'
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Topbar, {
    title: "Dashboard",
    subtitle: "Your active and completed 360s, all in one place.",
    actions: /*#__PURE__*/React.createElement(Button, {
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 18
      }),
      onClick: () => onNav('launch')
    }, "Launch a 360")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 36,
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: true
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Active 360s",
    value: 2,
    delta: "2 closing soon",
    deltaDir: "flat"
  })), /*#__PURE__*/React.createElement(Card, {
    padded: true
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Avg overall score",
    value: "4.6",
    unit: "/5",
    delta: "+0.4",
    deltaDir: "up"
  })), /*#__PURE__*/React.createElement(Card, {
    padded: true
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Respondents this month",
    value: 19,
    delta: 6
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      margin: 0,
      letterSpacing: '-0.01em'
    }
  }, "Your 360s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('my360s'),
    style: {
      background: 'none',
      border: 0,
      color: 'var(--text-brand)',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer'
    }
  }, "View all")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, reviews.map(r => {
    const done = r.status === 'complete';
    return /*#__PURE__*/React.createElement(Card, {
      key: r.id,
      padded: true,
      interactive: true,
      onClick: () => done && onNav('guideReport'),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 20
      }
    }, done ? /*#__PURE__*/React.createElement(ScoreRing, {
      value: r.score,
      max: 5,
      size: 68,
      thickness: 7,
      caption: ""
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 68,
        height: 68,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--surface-sunken)',
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 24
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, r.name), done ? /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      dot: true
    }, "Complete") : /*#__PURE__*/React.createElement(Badge, {
      tone: "warning",
      dot: true
    }, "Collecting")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: 'var(--text-muted)',
        margin: '4px 0 10px'
      }
    }, r.when), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 320
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: r.resp,
      max: r.total,
      tone: done ? 'success' : 'brand',
      showValue: true,
      format: (v, m) => `${v}/${m} responses`
    }))), /*#__PURE__*/React.createElement(AvatarGroup, {
      people: PEOPLE.slice(0, r.resp),
      max: 4,
      size: "sm"
    }), done ? /*#__PURE__*/React.createElement(Button, {
      variant: "subtle",
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 16
      }),
      onClick: e => {
        e.stopPropagation();
        onNav('guideReport');
      }
    }, "View guide") : /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: e => {
        e.stopPropagation();
        onNav('survey');
      }
    }, "Preview survey"));
  })))));
}

/* ============================ LAUNCH ============================ */
function Launch({
  onNav,
  onLaunch
}) {
  const [recipients, setRecipients] = React.useState(['ana@northwind.com', 'jon@northwind.com', 'mia@acme.co']);
  const [draft, setDraft] = React.useState('');
  const [anon, setAnon] = React.useState(true);
  const [tmpl, setTmpl] = React.useState('leadership');
  const add = () => {
    const v = draft.trim();
    if (v && !recipients.includes(v)) setRecipients([...recipients, v]);
    setDraft('');
  };
  const templates = [['leadership', 'Leadership 360', '18 questions across 6 competencies'], ['manager', 'New manager', '12 questions on team & delegation'], ['custom', 'Start from scratch', 'Build your own question set']];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Topbar, {
    title: "Launch a 360",
    subtitle: "Set it up in minutes \u2014 we handle collection and synthesis.",
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-left",
        size: 16
      }),
      onClick: () => onNav('dashboard')
    }, "Cancel")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 36,
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: 28,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Step 1 \xB7 Basics"), /*#__PURE__*/React.createElement(Input, {
    label: "What are we reviewing?",
    placeholder: "e.g. Dana's leadership 360",
    defaultValue: "Dana \u2014 CEO, Northwind"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Who is this for?",
    defaultValue: "client",
    options: [{
      value: 'me',
      label: 'Myself'
    }, {
      value: 'client',
      label: 'A coaching client'
    }, {
      value: 'teammate',
      label: 'A team member'
    }]
  })), /*#__PURE__*/React.createElement(Card, {
    padded: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Step 2 \xB7 Question set"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, templates.map(([id, t, d]) => /*#__PURE__*/React.createElement(Radio, {
    key: id,
    name: "tmpl",
    card: true,
    label: t,
    description: d,
    checked: tmpl === id,
    onChange: () => setTmpl(id)
  })))), /*#__PURE__*/React.createElement(Card, {
    padded: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Step 3 \xB7 Respondents"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Invite by email",
    placeholder: "name@company.com",
    value: draft,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "mail",
      size: 16
    }),
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      }
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: add
  }, "Add")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, recipients.map(r => /*#__PURE__*/React.createElement(Tag, {
    key: r,
    onRemove: () => setRecipients(recipients.filter(x => x !== r))
  }, r))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--divider)',
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Keep all responses anonymous",
    checked: anon,
    onChange: e => setAnon(e.target.checked)
  })))), /*#__PURE__*/React.createElement(Card, {
    padded: true,
    elevation: "md",
    style: {
      position: 'sticky',
      top: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700
    }
  }, "Ready to launch"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [['file-text', `${templates.find(t => t[0] === tmpl)[1]} template`], ['users', `${recipients.length} respondents invited`], [anon ? 'lock' : 'eye', anon ? 'Anonymous responses' : 'Named responses'], ['sparkles', 'AI Growth Guide on close']].map(([ic, tx]) => /*#__PURE__*/React.createElement("div", {
    key: tx,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 18
  })), tx))), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 17
    }),
    onClick: onLaunch
  }, "Launch 360"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)',
      margin: 0,
      textAlign: 'center',
      lineHeight: 1.5
    }
  }, "Invitations send immediately. You can add respondents later."))));
}

/* ============================ SURVEY (respondent) ============================ */
function Survey({
  onExit
}) {
  const QS = [{
    t: 'They communicate a clear and compelling vision.',
    min: 'Rarely',
    max: 'Consistently'
  }, {
    t: 'They give candid, timely feedback.',
    min: 'Rarely',
    max: 'Consistently'
  }, {
    t: 'They create an environment where people feel safe to speak up.',
    min: 'Rarely',
    max: 'Consistently'
  }];
  const [i, setI] = React.useState(0);
  const [vals, setVals] = React.useState({});
  const [note, setNote] = React.useState('');
  const q = QS[i];
  const last = i === QS.length - 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 64,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 16,
      background: 'var(--surface)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 26
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })
  }, "Anonymous"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onExit,
    style: {
      background: 'none',
      border: 0,
      color: 'var(--text-muted)',
      cursor: 'pointer',
      fontSize: 13.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }), "Exit preview"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '56px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: i + 1,
    max: QS.length,
    showValue: true,
    label: `Question ${i + 1} of ${QS.length}`,
    format: (v, m) => `${Math.round(v / m * 100)}%`
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10,
      fontSize: 14,
      color: 'var(--text-muted)'
    }
  }, "You're giving feedback on ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "Dana"), "."), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 30,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      margin: '0 0 28px',
      color: 'var(--text-primary)'
    }
  }, q.t), /*#__PURE__*/React.createElement(RatingScale, {
    value: vals[i],
    onChange: v => setVals({
      ...vals,
      [i]: v
    }),
    minLabel: q.min,
    maxLabel: q.max,
    allowNA: true
  }), last && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(Textarea, {
    label: "Anything you'd add? (optional)",
    placeholder: "Share a specific example\u2026",
    maxLength: 500,
    value: note,
    onChange: e => setNote(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    disabled: i === 0,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 16
    }),
    onClick: () => setI(Math.max(0, i - 1))
  }, "Back"), last ? /*#__PURE__*/React.createElement(Button, {
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 17
    }),
    onClick: onExit
  }, "Submit feedback") : /*#__PURE__*/React.createElement(Button, {
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 16
    }),
    onClick: () => setI(i + 1)
  }, "Next")))));
}

/* ============================ GROWTH GUIDE REPORT ============================ */
function GuideReport({
  onNav
}) {
  const [tab, setTab] = React.useState('overview');
  const dims = [['Communication', 4.8], ['Vision & strategy', 4.5], ['Builds trust', 4.7], ['Delegation', 3.6], ['Decisiveness', 4.2], ['Develops others', 3.9]];
  const recs = [['book-open', 'Multipliers', 'Liz Wiseman', 'On getting more from your team by leading lighter.'], ['users', 'The Making of a Manager', 'Julie Zhuo', 'Practical delegation and feedback habits.'], ['compass', 'Coaching for Performance', 'John Whitmore', 'A framework for raising ownership.']];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Topbar, {
    title: "Growth Guide",
    subtitle: "Dana \u2014 Leadership 360 \xB7 9 respondents",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "share-2",
        size: 16
      })
    }, "Share"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 16
      })
    }, "Export PDF"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 36px 0'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      value: 'overview',
      label: 'Overview'
    }, {
      value: 'feedback',
      label: 'Feedback',
      count: 9
    }, {
      value: 'recs',
      label: 'Recommendations'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 36,
      paddingTop: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, tab === 'overview' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padded: true,
    style: {
      display: 'flex',
      gap: 30,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(ScoreRing, {
    value: 4.6,
    max: 5,
    size: 132,
    caption: "overall",
    inverse: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "AI Growth Guide"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 28,
      lineHeight: 1.25,
      color: '#fff',
      margin: '12px 0 8px',
      maxWidth: '28ch'
    }
  }, "A trusted, visionary leader \u2014 ready to grow by letting go."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 15,
      lineHeight: 1.6,
      margin: 0,
      maxWidth: '60ch'
    }
  }, "Respondents consistently praise your clarity and the trust you build. The clearest growth edge: delegate ownership earlier and name hard things sooner."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 16
    }
  }, "Competencies"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13
    }
  }, dims.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 130,
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: v,
    max: 5,
    tone: v >= 4.5 ? 'success' : v < 4 ? 'gold' : 'brand'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, v))))), /*#__PURE__*/React.createElement(Card, {
    padded: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700
    }
  }, "Your priorities"), [['Delegate earlier', 'Your team is ready for more ownership than you give.'], ['Name the hard things', 'Move tension into the open, sooner.'], ['Protect deep work', 'Guard the time your best thinking needs.']].map(([t, b], idx) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 12,
      paddingTop: idx ? 13 : 0,
      borderTop: idx ? '1px solid var(--divider)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--brand)',
      fontSize: 13,
      marginTop: 1
    }
  }, "0", idx + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-secondary)',
      marginTop: 2,
      lineHeight: 1.5
    }
  }, b)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-600)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trending-up",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700
    }
  }, "Strengths")), ['Communicates a clear, compelling vision', 'Builds genuine trust across the team', 'Stays calm and steady under pressure'].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      padding: '7px 0',
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-600)',
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  })), s))), /*#__PURE__*/React.createElement(Card, {
    padded: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold-600)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "target",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700
    }
  }, "Blind spots")), ['Holds decisions too long when consensus is unclear', 'Takes on work the team is ready to own', 'Avoids naming interpersonal tension'].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      padding: '7px 0',
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold-600)',
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dot",
    size: 16
  })), s))))), tab === 'feedback' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, [['Peer', 'They set the clearest vision I\u2019ve worked under. I always know why we\u2019re doing the work.'], ['Direct report', 'I wish they\u2019d hand off more. I\u2019m ready for bigger ownership and they tend to hold on.'], ['Peer', 'Unflappable in a crisis. The calm is contagious and it makes the whole team steadier.'], ['Direct report', 'When there\u2019s tension on the team, it can sit unaddressed longer than it should.'], ['Manager', 'Strong judgment. Decisions occasionally stall waiting for consensus that isn\u2019t coming.'], ['Peer', 'Deeply trusted. People bring them the real problems, not the polished version.']].map(([who, quote], idx) => /*#__PURE__*/React.createElement(Card, {
    key: idx,
    padded: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "outline"
  }, who), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--teal-300)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "quote",
    size: 18
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 16,
      lineHeight: 1.5,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, quote)))), tab === 'recs' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 620
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Curated for your profile"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 26,
      lineHeight: 1.2,
      margin: '10px 0 0'
    }
  }, "Books, teachers and resources to grow your edge.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 18
    }
  }, recs.map(([ic, title, who, why]) => /*#__PURE__*/React.createElement(Card, {
    key: title,
    padded: true,
    interactive: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 12,
      background: 'var(--gold-100)',
      color: 'var(--gold-600)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--text-primary)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, who)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-secondary)',
      margin: 0,
      lineHeight: 1.5
    }
  }, why)))))));
}

/* ============================ EMPTY (placeholder routes) ============================ */
function ComingSoon({
  title
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Topbar, {
    title: title
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 36
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: true,
    style: {
      textAlign: 'center',
      padding: '64px 24px',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      marginBottom: 12,
      color: 'var(--neutral-400)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "hammer",
    size: 28
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 15
    }
  }, "This area isn't part of the kit yet."))));
}

/* ============================ APP ============================ */
function AppKit() {
  const [view, setView] = React.useState('dashboard');
  const [toast, setToast] = React.useState(null);
  const onNav = v => setView(v);
  const onLaunch = () => {
    setView('dashboard');
    setToast({
      tone: 'success',
      title: '360 launched',
      body: 'Invitations sent to your respondents.'
    });
    setTimeout(() => setToast(null), 4200);
  };
  if (view === 'survey') return /*#__PURE__*/React.createElement(Survey, {
    onExit: () => setView('dashboard')
  });
  let screen;
  if (view === 'dashboard' || view === 'my360s') screen = /*#__PURE__*/React.createElement(Dashboard, {
    onNav: onNav
  });else if (view === 'launch') screen = /*#__PURE__*/React.createElement(Launch, {
    onNav: onNav,
    onLaunch: onLaunch
  });else if (view === 'guideReport' || view === 'guide') screen = /*#__PURE__*/React.createElement(GuideReport, {
    onNav: onNav
  });else screen = /*#__PURE__*/React.createElement(ComingSoon, {
    title: view === 'templates' ? 'Templates' : 'Settings'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--bg-page)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    view: view,
    onNav: onNav
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, screen), toast && /*#__PURE__*/React.createElement(ToastViewport, null, /*#__PURE__*/React.createElement(Toast, {
    tone: toast.tone,
    title: toast.title,
    onClose: () => setToast(null)
  }, toast.body)));
}
window.AppKit = AppKit;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
/* 360 — App UI kit · shell (sidebar, topbar, shared helpers).
 * Composes window.Ds360GrowthDesignSystem_39b0a1. Loaded before AppScreens.jsx. */

const DS = window.Ds360GrowthDesignSystem_39b0a1;

/* ---- Icon (Lucide) ---- */
function Icon({
  name,
  size = 20,
  stroke = 1.75,
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: {
          'stroke-width': stroke,
          width: size,
          height: size
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: 'inline-flex',
      ...style
    }
  });
}
window.Icon = Icon;

/* ---- Sidebar ---- */
function Sidebar({
  view,
  onNav
}) {
  const {
    Logo,
    Avatar
  } = DS;
  const items = [['dashboard', 'layout-dashboard', 'Dashboard'], ['my360s', 'circle-dot', 'My 360s'], ['guide', 'compass', 'Growth Guide'], ['templates', 'file-text', 'Templates']];
  const item = (id, icon, label, active) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => onNav(id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      border: 0,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 14.5,
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
      background: active ? 'var(--brand-subtle)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 19
  }), label);
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-width)',
      flex: 'none',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px 22px'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 28
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, items.map(([id, icon, label]) => item(id, icon, label, view === id || id === 'guide' && view === 'guideReport'))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('settings'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      border: 0,
      cursor: 'pointer',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 14.5,
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 19
  }), "Settings"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 8px',
      borderTop: '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Andrew Horn",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Andrew Horn"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Coach")))));
}
window.Sidebar = Sidebar;

/* ---- Topbar ---- */
function Topbar({
  title,
  subtitle,
  actions
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      padding: '28px 36px 22px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      margin: 0,
      color: 'var(--text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-secondary)',
      margin: '5px 0 0'
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, actions));
}
window.Topbar = Topbar;

/* shared section eyebrow */
function Eyebrow({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, children);
}
window.Eyebrow = Eyebrow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MarketingSite.jsx
try { (() => {
/* 360 — Marketing site UI kit.
 * Composes the design-system primitives (window.Ds360GrowthDesignSystem_39b0a1).
 * Copy is lifted from get360growth.com (home + about). Pricing figures are illustrative. */

const DS = window.Ds360GrowthDesignSystem_39b0a1;
const {
  Logo,
  Button,
  Card,
  Badge,
  ScoreRing,
  Stat,
  Avatar,
  AvatarGroup
} = DS;

/* ---- Icon (Lucide) ---- */
function Icon({
  name,
  size = 20,
  stroke = 1.75,
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: {
          'stroke-width': stroke,
          width: size,
          height: size
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: 'inline-flex',
      ...style
    }
  });
}
window.Icon = Icon;
const Eyebrow = ({
  children,
  light
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: light ? 'var(--teal-300)' : 'var(--text-brand)',
    marginBottom: 16
  }
}, children);
const Container = ({
  children,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    width: '100%',
    maxWidth: 1180,
    margin: '0 auto',
    padding: '0 40px',
    ...style
  }
}, children);

/* ---- Header ---- */
function SiteHeader({
  onNav,
  view
}) {
  const link = (id, label) => /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav(id),
    style: {
      background: 'none',
      border: 0,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      color: view === id ? 'var(--text-brand)' : 'var(--text-secondary)',
      padding: '6px 2px'
    }
  }, label);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(247,246,242,0.82)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(Container, {
    style: {
      height: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('home'),
    style: {
      background: 'none',
      border: 0,
      cursor: 'pointer',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 30
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 26,
      marginLeft: 8
    }
  }, link('home', 'How it works'), link('pricing', 'Pricing'), link('about', 'About')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 0,
      cursor: 'pointer',
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 16
    }),
    onClick: () => onNav('pricing')
  }, "Start your 360"))));
}
window.SiteHeader = SiteHeader;

/* ---- Growth Guide preview (hero + feature visual) ---- */
function GuidePreview() {
  return /*#__PURE__*/React.createElement(Card, {
    elevation: "md",
    padded: false,
    style: {
      width: '100%',
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--gradient-dark)',
      padding: '22px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(ScoreRing, {
    value: 4.6,
    max: 5,
    caption: "overall",
    size: 104,
    inverse: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "AI Growth Guide"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#fff',
      fontSize: 19,
      fontWeight: 700,
      marginTop: 10,
      fontFamily: 'var(--font-sans)',
      letterSpacing: '-0.01em'
    }
  }, "Andrew's leadership 360"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 13,
      marginTop: 2
    }
  }, "9 respondents \xB7 synthesized"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, [['Communication', 4.8], ['Strategic clarity', 4.5], ['Delegation', 3.6]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2,
      height: 8,
      borderRadius: 999,
      background: 'var(--neutral-200)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${v / 5 * 100}%`,
      height: '100%',
      background: 'var(--gradient-brand)',
      borderRadius: 999
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-secondary)',
      width: 26,
      textAlign: 'right'
    }
  }, v))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--divider)',
      paddingTop: 14,
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold-600)',
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "Priority:"), " Delegate ownership earlier \u2014 your team is ready for more."))));
}

/* ---- Hero ---- */
function Hero({
  onNav
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--gradient-paper)'
    }
  }, /*#__PURE__*/React.createElement(Container, {
    style: {
      padding: '76px 40px 64px',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "AI-enabled 360\xB0 feedback"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 56,
      lineHeight: 1.04,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Get honest 360\xB0 feedback that actually helps you grow."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 19,
      lineHeight: 1.55,
      color: 'var(--text-secondary)',
      margin: '22px 0 30px',
      maxWidth: '46ch'
    }
  }, "360 is the premier AI-enabled feedback tool, designed to make powerful, actionable insight accessible to anyone serious about growth."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    }),
    onClick: () => onNav('pricing')
  }, "Start your 360"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    onClick: () => document.getElementById('how')?.scrollIntoView({
      behavior: 'smooth'
    })
  }, "See how it works")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement(AvatarGroup, {
    people: [{
      name: 'Ana Reed'
    }, {
      name: 'Jon Diaz'
    }, {
      name: 'Mia Lee'
    }, {
      name: 'Sam Roe'
    }],
    max: 4,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)'
    }
  }, "Trusted by coaches & founders at growth-stage companies."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(GuidePreview, null))), /*#__PURE__*/React.createElement(Container, {
    style: {
      paddingBottom: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      borderTop: '1px solid var(--border)',
      paddingTop: 26
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, "As seen in"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 26,
      color: 'var(--neutral-700)',
      fontStyle: 'italic'
    }
  }, "Inc."))));
}

/* ---- How it works ---- */
function HowItWorks() {
  const steps = [['01', 'send', 'Launch in minutes', 'Set up your 360, choose your questions, and invite respondents in a few clicks. No HR platform required.'], ['02', 'message-circle', 'We collect & synthesize', 'We handle the logistics of gathering anonymous feedback and use AI to synthesize it — without sacrificing depth.'], ['03', 'compass', 'Get your Growth Guide', 'Receive clear priorities, practical behavior shifts, and curated books, teachers and resources for your profile.']];
  return /*#__PURE__*/React.createElement("section", {
    id: "how",
    style: {
      padding: '88px 0'
    }
  }, /*#__PURE__*/React.createElement(Container, null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "How it works"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 40,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      margin: 0,
      color: 'var(--text-primary)'
    }
  }, "Powerful feedback, without the busywork.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 22
    }
  }, steps.map(([n, icon, title, body]) => /*#__PURE__*/React.createElement(Card, {
    key: n,
    padded: true,
    interactive: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: 'var(--brand-subtle)',
      color: 'var(--text-brand)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, n)), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 19,
      fontWeight: 700,
      margin: 0,
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.55,
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, body))))));
}

/* ---- Growth Guide feature ---- */
function GuideFeature() {
  const points = [['target', 'Targeted development areas', 'Know exactly where to focus, ranked by impact.'], ['compass', 'Practical behavior shifts', 'Specific, repeatable changes — not vague advice.'], ['book-open', 'Curated recommendations', 'Books, teachers and experiences matched to your profile.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-subtle)',
      padding: '88px 0'
    }
  }, /*#__PURE__*/React.createElement(Container, {
    style: {
      display: 'grid',
      gridTemplateColumns: '0.95fr 1.05fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "The Growth Guide"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 40,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      margin: '0 0 18px',
      color: 'var(--text-primary)'
    }
  }, "We don't just show you your data. We help you move."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16.5,
      lineHeight: 1.6,
      color: 'var(--text-secondary)',
      margin: '0 0 26px',
      maxWidth: '46ch'
    }
  }, "Every customer receives a comprehensive, personalized Growth Guide that translates raw feedback into clear priorities and tangible next steps."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, points.map(([icon, t, b]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      color: 'var(--brand)',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      marginTop: 2,
      lineHeight: 1.5
    }
  }, b)))))), /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padded: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--teal-300)'
    }
  }, "Your priorities"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 24,
      color: '#fff',
      marginTop: 8
    }
  }, "Where to grow next")), /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "3 focus areas")), [['Delegate earlier', 'Your team is ready for more ownership.'], ['Name the hard things', 'Move tension into the open, sooner.'], ['Protect deep work', 'Guard the time your best thinking needs.']].map(([t, b], i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 14,
      paddingTop: i ? 16 : 0,
      borderTop: i ? '1px solid rgba(255,255,255,0.1)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--teal-300)',
      fontSize: 13,
      marginTop: 2
    }
  }, "0", i + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 600
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: 13.5,
      marginTop: 2
    }
  }, b)))))));
}

/* ---- The problem (three I's) ---- */
function Problem() {
  const items = [['lock', 'Inaccessible', 'Most 360 tools are buried inside large HR platforms — complex, expensive, and built for enterprises, not individuals or small teams.'], ['clock', 'Inefficient', 'Organizing a 360 manually is messy. Feedback comes through email, forms and scattered docs. Coordinating respondents takes forever.'], ['bar-chart-3', 'Incomplete', 'Even great feedback often leaves you unsure what to do next. Insight without operationalization rarely leads to lasting change.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '88px 0'
    }
  }, /*#__PURE__*/React.createElement(Container, null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      marginBottom: 44
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "The problem we saw"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 40,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      margin: 0,
      color: 'var(--text-primary)'
    }
  }, "The traditional 360 is either too expensive, too complicated, or too incomplete.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 22
    }
  }, items.map(([icon, t, b]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--neutral-500)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      margin: 0,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-serif)',
      fontWeight: 500
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.55,
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, b))))));
}

/* ---- CTA ---- */
function CTA({
  onNav
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '32px 0 96px'
    }
  }, /*#__PURE__*/React.createElement(Container, null, /*#__PURE__*/React.createElement(Card, {
    tone: "brand",
    padded: true,
    style: {
      textAlign: 'center',
      padding: '64px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: 16
    }
  }, "Transform your leadership"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      color: '#fff',
      margin: '0 auto 26px',
      maxWidth: '20ch'
    }
  }, "Where growth is not accidental, but intentional."), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "inverse",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    }),
    onClick: () => onNav('pricing')
  }, "Start your 360"))));
}

/* ---- Footer ---- */
function SiteFooter() {
  const col = (title, links) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 14
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14.5,
      color: 'var(--text-secondary)',
      textDecoration: 'none'
    }
  }, l))));
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--bg-page-dark)',
      padding: '64px 0 40px'
    }
  }, /*#__PURE__*/React.createElement(Container, {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr 1fr',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    size: 30,
    tone: "inverse"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'rgba(255,255,255,0.62)',
      fontSize: 15,
      lineHeight: 1.55,
      margin: '18px 0 0',
      maxWidth: '32ch'
    }
  }, "Get honest 360\xB0 feedback that actually helps you grow as a leader.")), col('Company', ['About us', 'Careers', 'Contact']), col('Legal', ['Privacy Policy', 'Terms of Service'])), /*#__PURE__*/React.createElement(Container, {
    style: {
      marginTop: 48,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 13
    }
  }, "\xA9 2026 360. All rights reserved."), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 13,
      fontFamily: 'var(--font-mono)'
    }
  }, "Built for growth.")));
}

/* ---- Pricing ---- */
function Pricing({
  onNav
}) {
  const tiers = [{
    name: 'Individual',
    price: '$149',
    unit: 'per 360',
    desc: 'One complete 360 with your full Growth Guide.',
    cta: 'Start your 360',
    featured: false,
    features: ['1 leadership 360', 'Up to 12 respondents', 'AI Growth Guide', 'Curated recommendations']
  }, {
    name: 'Coach',
    price: '$59',
    unit: 'per client / mo',
    desc: 'Run unlimited 360s across your client roster.',
    cta: 'Start coaching',
    featured: true,
    features: ['Unlimited 360s', 'Multi-client dashboard', 'White-glove templates', 'Growth Guide for every client', 'Priority support']
  }, {
    name: 'Team',
    price: 'Custom',
    unit: "let's talk",
    desc: 'Make 360s a foundational talent ritual.',
    cta: 'Talk to us',
    featured: false,
    features: ['Everything in Coach', 'Org-wide rollout', 'Shared question library', 'Aggregate insights', 'SSO & admin controls']
  }];
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--gradient-paper)',
      padding: '72px 0 40px'
    }
  }, /*#__PURE__*/React.createElement(Container, {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Pricing"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 48,
      lineHeight: 1.06,
      letterSpacing: '-0.02em',
      margin: '0 auto',
      maxWidth: '18ch',
      color: 'var(--text-primary)'
    }
  }, "Candid feedback, finally within reach."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'var(--text-secondary)',
      margin: '20px auto 0',
      maxWidth: '52ch',
      lineHeight: 1.55
    }
  }, "Growth shouldn't be reserved for executives with large coaching budgets. Pick the plan that fits how you work."))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '24px 0 88px'
    }
  }, /*#__PURE__*/React.createElement(Container, {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 22,
      alignItems: 'start'
    }
  }, tiers.map(t => /*#__PURE__*/React.createElement(Card, {
    key: t.name,
    padded: true,
    elevation: t.featured ? 'md' : 'sm',
    style: {
      border: t.featured ? '1.5px solid var(--brand)' : undefined,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      paddingTop: t.featured ? 28 : 22
    }
  }, t.featured && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -12,
      left: 22
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "gold"
  }, "Most popular")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--text-primary)'
    }
  }, t.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginTop: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 40,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, t.price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, t.unit)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      margin: '10px 0 0',
      lineHeight: 1.5
    }
  }, t.desc)), /*#__PURE__*/React.createElement(Button, {
    variant: t.featured ? 'primary' : 'secondary',
    fullWidth: true,
    onClick: () => onNav('home')
  }, t.cta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      borderTop: '1px solid var(--divider)',
      paddingTop: 18
    }
  }, t.features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, f)))))))));
}

/* ---- App ---- */
function MarketingSite() {
  const [view, setView] = React.useState('home');
  const onNav = v => {
    setView(v);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-page)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(SiteHeader, {
    onNav: onNav,
    view: view
  }), view === 'pricing' ? /*#__PURE__*/React.createElement(Pricing, {
    onNav: onNav
  }) : /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Hero, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(HowItWorks, null), /*#__PURE__*/React.createElement(GuideFeature, null), /*#__PURE__*/React.createElement(Problem, null), /*#__PURE__*/React.createElement(CTA, {
    onNav: onNav
  })), /*#__PURE__*/React.createElement(SiteFooter, null));
}
window.MarketingSite = MarketingSite;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MarketingSite.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.AvatarGroup = __ds_scope.AvatarGroup;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.ScoreRing = __ds_scope.ScoreRing;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.ToastViewport = __ds_scope.ToastViewport;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.RatingScale = __ds_scope.RatingScale;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
