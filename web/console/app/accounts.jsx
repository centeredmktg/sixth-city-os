/* ============================================================
   Accounts — the full book + per-firm evidence trail.
   List every scored account; click through to the detail view:
   score breakdown (ABCR), the signal evidence trail (why this
   firm, with sources), routing status, and the outreach draft.
   LIVE: reads PE.STREAM (from /api/candidates).
   ============================================================ */
const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;
const PEA = window.PE;
const IcoA = PEA.Icons;
const { Badge: BadgeA, Button: BtnA } = window.SixthCityMarketingDesignSystem_4d5a9e;

const BAND_TONE = { A: "green", B: "warning", C: "neutral", R: "danger" };
const SIG_ICON = {
  site_quality: "Gauge", ads_active: "Activity", ads_stale: "Activity",
  seo_gap: "Search", keyword_gap: "Search", backlink_gap: "Globe", content_gap: "Layers",
  local_seo_gap: "MapPin", ai_citation_gap: "Sparkles", review_velocity: "Star",
  hiring_marketing: "Briefcase", new_location: "MapPin",
};

const AC_CSS = `
.ac-search{ display:flex; align-items:center; gap:9px; padding:10px 14px; margin:18px 0; background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-md); box-shadow:var(--shadow-xs); }
.ac-search input{ border:none; outline:none; background:transparent; font-size:var(--text-sm); width:100%; color:var(--text-body); }
.ac-tbl{ width:100%; border-collapse:collapse; background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-sm); }
.ac-tbl th{ text-align:left; font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--text-subtle); padding:11px 16px; border-bottom:1px solid var(--border-default); background:var(--surface-cream); }
.ac-tbl td{ padding:13px 16px; border-bottom:1px solid var(--border-subtle); font-size:var(--text-sm); }
.ac-tbl tr:last-child td{ border-bottom:none; }
.ac-tbl tbody tr{ cursor:pointer; transition:background var(--tap-transition); }
.ac-tbl tbody tr:hover{ background:var(--surface-cream); }
.ac-nm{ font-weight:800; color:var(--text-strong); }
.ac-sub{ font-size:11px; color:var(--text-muted); margin-top:2px; }
.ac-mini{ display:inline-flex; align-items:center; gap:6px; }
.ac-minibar{ width:54px; height:6px; border-radius:99px; background:var(--stone-150); overflow:hidden; }
.ac-minibar i{ display:block; height:100%; border-radius:99px; }
.ac-num{ font-family:var(--font-condensed); font-weight:800; font-size:14px; color:var(--text-strong); }
/* detail */
.ac-hero{ display:flex; align-items:center; gap:22px; padding:22px 24px; background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); margin-bottom:18px; }
.ac-hero__nm{ font-family:var(--font-display); font-weight:900; font-size:var(--text-2xl); color:var(--text-strong); }
.ac-hero__meta{ display:flex; flex-wrap:wrap; gap:14px; margin-top:8px; font-size:12px; color:var(--text-muted); }
.ac-hero__meta a{ color:var(--coral-600); text-decoration:none; }
.ac-hero__band{ margin-left:auto; text-align:center; }
.ac-hero__band b{ font-family:var(--font-condensed); font-weight:800; font-size:42px; color:var(--coral-600); display:block; line-height:1; }
.ac-hero__band span{ font-family:var(--font-mono); font-size:9px; letter-spacing:.1em; color:var(--text-subtle); }
.ac-grid{ display:grid; grid-template-columns:1.5fr 1fr; gap:18px; align-items:start; }
@media (max-width:1000px){ .ac-grid{ grid-template-columns:1fr; } }
.ac-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); margin-bottom:18px; }
.ac-card__h{ padding:14px 18px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.ac-card__h h4{ margin:0; font-size:var(--text-md); }
.ac-card__h .pe-overline{ margin-left:auto; }
.ac-card__b{ padding:16px 18px; }
.ac-score{ display:flex; align-items:center; gap:11px; margin-bottom:11px; }
.ac-score__k{ width:74px; font-size:12px; color:var(--text-muted); flex:none; }
.ac-track{ flex:1; height:8px; border-radius:99px; background:var(--stone-150); overflow:hidden; }
.ac-track i{ display:block; height:100%; border-radius:99px; }
.ac-score__v{ width:38px; text-align:right; font-family:var(--font-condensed); font-weight:800; color:var(--text-strong); }
.ac-formula{ margin-top:6px; padding:10px 12px; background:var(--surface-cream); border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
.ac-sig{ display:flex; gap:12px; padding:13px 0; border-bottom:1px solid var(--border-subtle); }
.ac-sig:last-child{ border-bottom:none; }
.ac-sig__ic{ width:30px; height:30px; border-radius:var(--radius-sm); background:var(--coral-50); color:var(--coral-600); display:grid; place-items:center; flex:none; }
.ac-sig__t{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); }
.ac-sig__d{ font-size:12px; color:var(--text-body); margin-top:3px; line-height:1.4; }
.ac-sig__m{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle); margin-top:4px; }
.ac-kv{ display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--border-subtle); font-size:13px; }
.ac-kv:last-child{ border-bottom:none; }
.ac-kv__k{ color:var(--text-muted); }
.ac-kv__v{ font-weight:700; color:var(--text-strong); }
.ac-empty{ text-align:center; padding:50px 20px; color:var(--text-muted); }
.ac-contact{ padding:10px 0; border-bottom:1px solid var(--border-subtle); }
.ac-contact:last-child{ border-bottom:none; }
.ac-contact__nm{ font-weight:700; font-size:13px; color:var(--text-strong); }
.ac-contact__ti{ font-size:11px; color:var(--text-muted); margin-top:1px; }
.ac-contact__c{ font-size:11px; margin-top:3px; } .ac-contact__c a{ color:var(--coral-600); text-decoration:none; }
`;
(function(){ if(document.getElementById("ac-css"))return; const s=document.createElement("style"); s.id="ac-css"; s.textContent=AC_CSS; document.head.appendChild(s); })();

const fmtA = (n) => (n == null ? "—" : Math.round(n));
function totalHeat(v) { return v >= 80 ? "var(--coral-500)" : v >= 60 ? "var(--orange-400)" : v >= 40 ? "var(--stone-500)" : "var(--stone-400)"; }
function timeHeat(v) { return v >= 70 ? "var(--green-500)" : v >= 55 ? "var(--orange-400)" : "var(--stone-400)"; }

function ScoreRing({ value }) {
  const r = 44, C = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0));
  const color = totalHeat(v);
  return (
    <svg width="108" height="108" viewBox="0 0 108 108" style={{ flex: "none" }}>
      <circle cx="54" cy="54" r={r} fill="none" stroke="var(--stone-150)" strokeWidth="8" />
      <circle cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} transform="rotate(-90 54 54)" />
      <text x="54" y="52" textAnchor="middle" fontFamily="var(--font-condensed)" fontWeight="800" fontSize="30" fill="var(--text-strong)">{Math.round(v)}</text>
      <text x="54" y="70" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={color}>{v >= 80 ? "HOT" : v >= 60 ? "WARM" : v >= 40 ? "COOL" : "COLD"}</text>
    </svg>
  );
}

function AccountDetail({ a, onBack }) {
  const [contacts, setContacts] = useStateA([]);
  const [pursued, setPursued] = useStateA(a.pursued);
  const [pursuing, setPursuing] = useStateA(false);
  const [err, setErr] = useStateA("");

  useEffectA(() => {
    if (a.pursued) PEA.fetchContacts(a.domain).then(setContacts).catch(() => {});
  }, [a.domain]);

  async function pursue() {
    setPursuing(true); setErr("");
    try {
      const res = await PEA.pursueDomains([a.domain]);
      const found = (res.pursued && res.pursued[0]) || {};
      setContacts(found.contacts || []);
      setPursued(true);
      if (!res.apollo_configured) setErr("Apollo isn't configured yet (set APOLLO_API_KEY) — no contacts sourced.");
      else if (!(found.contacts || []).length) setErr("No decision-makers found at this domain.");
    } catch (e) { setErr(String(e.message || e)); } finally { setPursuing(false); }
  }

  const dedupeBadge = a.netNew === true
    ? <BadgeA tone="green" variant="soft" dot>Net-new</BadgeA>
    : a.netNew === false ? <BadgeA tone="neutral" variant="soft">In your CRM</BadgeA>
    : <BadgeA tone="warning" variant="soft">Pending check</BadgeA>;
  return (
    <div className="pe-page">
      <div style={{ margin: "4px 0 16px" }}>
        <BtnA variant="ghost" size="sm" neutral icon={<IcoA.ChevronRight size={15} style={{ transform: "rotate(180deg)" }} />} onClick={onBack}>All accounts</BtnA>
      </div>

      <div className="ac-hero">
        <ScoreRing value={a.total} />
        <div style={{ minWidth: 0 }}>
          <div className="ac-hero__nm">{a.name}</div>
          <div className="ac-hero__meta">
            <span><IcoA.Building size={13} /> {PEA.Vertical[a.vertical] || a.vertical}</span>
            {a.city && <span><IcoA.MapPin size={13} /> {a.city}{a.state ? ", " + a.state : ""}</span>}
            <a href={"https://" + a.domain} target="_blank" rel="noreferrer"><IcoA.Globe size={13} /> {a.domain} <IcoA.External size={11} /></a>
            {dedupeBadge}
          </div>
        </div>
        <div className="ac-hero__band"><b>{a.band || "—"}</b><span>BAND</span></div>
      </div>

      <div className="ac-grid">
        <div>
          <div className="ac-card">
            <div className="ac-card__h"><IcoA.Gauge size={16} style={{ color: "var(--coral-500)" }} /><h4>Score breakdown</h4><span className="pe-overline">ABCR</span></div>
            <div className="ac-card__b">
              <div className="ac-score"><span className="ac-score__k">Fit</span><span className="ac-track"><i style={{ width: (a.fit || 0) + "%", background: "var(--stone-400)" }} /></span><span className="ac-score__v">{fmtA(a.fit)}</span></div>
              <div className="ac-score"><span className="ac-score__k">Timing</span><span className="ac-track"><i style={{ width: (a.timing || 0) + "%", background: timeHeat(a.timing || 0) }} /></span><span className="ac-score__v">{fmtA(a.timing)}</span></div>
              <div className="ac-score"><span className="ac-score__k">Composite</span><span className="ac-track"><i style={{ width: (a.total || 0) + "%", background: totalHeat(a.total || 0) }} /></span><span className="ac-score__v">{fmtA(a.total)}</span></div>
              <div className="ac-formula">fit {fmtA(a.fit)} × 0.4 + timing {fmtA(a.timing)} × 0.6 = {fmtA(a.total)} → band {a.band || "—"}</div>
              {a.scoreRationale && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{a.scoreRationale}</div>}
            </div>
          </div>

          <div className="ac-card">
            <div className="ac-card__h"><IcoA.Layers size={16} style={{ color: "var(--coral-500)" }} /><h4>Signal evidence trail</h4><span className="pe-overline">{(a.signals || []).length} signals</span></div>
            <div className="ac-card__b">
              {(a.signals || []).length === 0
                ? <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No signals yet — run the enrichment pass to attach site quality, ads, and SEO gaps.</div>
                : a.signals.map((s, i) => {
                    const SigI = IcoA[SIG_ICON[s.kind]] || IcoA.Dot;
                    return (
                      <div className="ac-sig" key={i}>
                        <div className="ac-sig__ic"><SigI size={15} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="ac-sig__t">{PEA.SignalKind[s.kind] || s.kind}</div>
                          {s.detail && <div className="ac-sig__d">{s.detail}</div>}
                          <div className="ac-sig__m">{s.source}{s.value != null ? " · value " + (Math.round(s.value * 100) / 100) : ""}</div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>

        <div>
          <div className="ac-card">
            <div className="ac-card__h"><IcoA.Route size={16} style={{ color: "var(--coral-500)" }} /><h4>Routing</h4></div>
            <div className="ac-card__b">
              <div className="ac-kv"><span className="ac-kv__k">Recommended</span><span className="ac-kv__v" style={{ textTransform: "capitalize" }}>{a.route || "—"}</span></div>
              <div className="ac-kv"><span className="ac-kv__k">Confirmed</span><span className="ac-kv__v">{a.routeConfirmed ? "Yes" : "Awaiting"}</span></div>
              <div className="ac-kv"><span className="ac-kv__k">Stage</span><span className="ac-kv__v" style={{ textTransform: "capitalize" }}>{(a.stage || "—").replace(/_/g, " ")}</span></div>
              <div className="ac-kv"><span className="ac-kv__k">In-market</span><span className="ac-kv__v">{a.inMarket === "confirmed" ? ("Confirmed — " + (a.inMarketWhy || "buying signal")) : "Unknown — qualify"}</span></div>
            </div>
          </div>

          <div className="ac-card">
            <div className="ac-card__h"><IcoA.Sparkles size={16} style={{ color: "var(--coral-500)" }} /><h4>Contacts</h4>{pursued && <span className="pe-overline">{contacts.length} sourced</span>}</div>
            <div className="ac-card__b">
              {!pursued ? (
                <React.Fragment>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.4 }}>
                    A company isn't actionable without a person. Commit to this opportunity to find &amp; enrich the decision-makers (Apollo).
                  </p>
                  <BtnA variant="primary" size="sm" icon={<IcoA.Zap size={14} />} disabled={pursuing} onClick={pursue}>
                    {pursuing ? "Finding contacts…" : "Pursue this opportunity"}
                  </BtnA>
                </React.Fragment>
              ) : contacts.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Pursued — no contacts on file.</p>
              ) : (
                contacts.map((c, i) => (
                  <div className="ac-contact" key={i}>
                    <div className="ac-contact__nm">{c.name}</div>
                    <div className="ac-contact__ti">{c.title}{c.seniority ? " · " + c.seniority : ""}</div>
                    <div className="ac-contact__c">
                      {c.email ? <a href={"mailto:" + c.email}>{c.email}</a> : <span style={{ color: "var(--text-subtle)" }}>email locked</span>}
                      {c.linkedin_url && <React.Fragment> · <a href={c.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a></React.Fragment>}
                    </div>
                  </div>
                ))
              )}
              {err && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 10 }}>{err}</div>}
            </div>
          </div>

          {a.outreach && a.outreach.subject && (
            <div className="ac-card">
              <div className="ac-card__h"><IcoA.Send size={16} style={{ color: "var(--coral-500)" }} /><h4>Outreach draft</h4></div>
              <div className="ac-card__b">
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-strong)", marginBottom: 6 }}>{a.outreach.subject}</div>
                <div style={{ fontSize: 12, color: "var(--text-body)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{a.outreach.body}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountsScreen() {
  const [q, setQ] = useStateA("");
  const [sel, setSel] = useStateA(null);
  const all = PEA.STREAM;
  const selected = sel ? all.find((x) => x.domain === sel) : null;

  const rows = useMemoA(() => {
    const t = q.trim().toLowerCase();
    const list = !t ? all : all.filter((a) =>
      (a.name || "").toLowerCase().includes(t) || (a.domain || "").toLowerCase().includes(t) || (a.vertical || "").includes(t));
    return list;
  }, [q, all]);

  if (selected) return <AccountDetail a={selected} onBack={() => setSel(null)} />;

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>The book · every scored account</div>
          <h2 style={{ margin: "6px 0 0" }}>Accounts</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "66ch" }}>
            Every firm the engine has scored — click any row for its full evidence trail: why it scored, the signals behind it, and where it's routed.
          </p>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="ac-empty"><IcoA.Building size={30} style={{ color: "var(--stone-400)" }} /><p>No accounts yet. Ingest a list to populate the book.</p></div>
      ) : (
        <React.Fragment>
          <div className="ac-search">
            <IcoA.Search size={16} style={{ color: "var(--text-subtle)" }} />
            <input placeholder="Search name, domain, or vertical…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-subtle)", flex: "none" }}>{rows.length} of {all.length}</span>
          </div>
          <table className="ac-tbl">
            <thead><tr><th>Account</th><th>Fit</th><th>Timing</th><th>Band</th><th>Route</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.domain} onClick={() => setSel(a.domain)}>
                  <td><div className="ac-nm">{a.name}</div><div className="ac-sub">{a.domain} · {PEA.Vertical[a.vertical] || a.vertical}</div></td>
                  <td><span className="ac-mini"><span className="ac-minibar"><i style={{ width: (a.fit || 0) + "%", background: "var(--stone-400)" }} /></span><span className="ac-num">{fmtA(a.fit)}</span></span></td>
                  <td><span className="ac-mini"><span className="ac-minibar"><i style={{ width: (a.timing || 0) + "%", background: timeHeat(a.timing || 0) }} /></span><span className="ac-num">{fmtA(a.timing)}</span></span></td>
                  <td><BadgeA tone={BAND_TONE[a.band] || "neutral"} variant="soft" size="sm">{a.band || "—"}</BadgeA></td>
                  <td style={{ textTransform: "capitalize", color: "var(--text-body)" }}>{a.route || "—"}</td>
                  <td>{a.netNew === true ? <BadgeA tone="green" variant="soft" size="sm" dot>Net-new</BadgeA> : a.netNew === false ? <BadgeA tone="neutral" variant="soft" size="sm">In CRM</BadgeA> : <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}
    </div>
  );
}

window.PE.AccountsScreen = AccountsScreen;
