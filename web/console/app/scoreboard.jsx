/* ============================================================
   Engine Impact — Sixth City's value scoreboard.
   What the engine is producing for THEIR pipeline: perfect-fit
   companies surfaced, added to the CRM, and (once HubSpot
   activity syncs) reached out to, meetings booked, pipeline
   generated. This is signal of value — NOT rev-share (that's
   tracked backend-only). LIVE: GET /api/scoreboard.
   ============================================================ */
const { useState: useStateS, useEffect: useEffectS } = React;
const PES = window.PE;
const IcoS = PES.Icons;
const { Badge: BadgeS } = window.SixthCityMarketingDesignSystem_4d5a9e;

const BAND_COLOR = { A: "var(--green-500)", B: "var(--orange-400)", C: "var(--stone-500)", R: "var(--stone-400)" };

const SB_CSS = `
.sb-funnel{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:20px 0; }
@media (max-width:900px){ .sb-funnel{ grid-template-columns:repeat(2,1fr); } }
.sb-stat{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:18px 20px; box-shadow:var(--shadow-sm); position:relative; overflow:hidden; }
.sb-stat--lead{ background:var(--ink-700); border-color:transparent; color:#fff; }
.sb-stat--lead::after{ content:""; position:absolute; inset:0; background:radial-gradient(80% 90% at 100% 0%, rgba(237,106,60,.26), transparent 60%); pointer-events:none; }
.sb-stat__l{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em; font-size:11px; font-weight:700; color:var(--text-subtle); margin-bottom:8px; display:flex; align-items:center; gap:7px; }
.sb-stat--lead .sb-stat__l{ color:var(--orange-400); }
.sb-stat__v{ font-family:var(--font-condensed); font-weight:800; font-size:44px; line-height:.95; color:var(--text-strong); letter-spacing:-.01em; }
.sb-stat--lead .sb-stat__v{ color:#fff; }
.sb-stat__note{ font-size:12px; color:var(--text-muted); margin-top:7px; line-height:1.4; }
.sb-grid{ display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; margin-top:6px; }
@media (max-width:900px){ .sb-grid{ grid-template-columns:1fr; } }
.sb-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.sb-card__h{ padding:14px 18px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.sb-card__h h4{ margin:0; font-size:var(--text-md); }
.sb-card__h .pe-overline{ margin-left:auto; }
.sb-card__b{ padding:16px 18px; }
.sb-row{ display:flex; align-items:center; gap:11px; padding:9px 0; }
.sb-row__k{ width:130px; flex:none; font-size:13px; color:var(--text-body); }
.sb-track{ flex:1; height:9px; border-radius:99px; background:var(--stone-150); overflow:hidden; }
.sb-track i{ display:block; height:100%; border-radius:99px; }
.sb-row__v{ width:42px; text-align:right; font-family:var(--font-condensed); font-weight:800; color:var(--text-strong); }
.sb-out{ display:flex; align-items:center; gap:13px; padding:14px 0; border-bottom:1px solid var(--border-subtle); }
.sb-out:last-child{ border-bottom:none; }
.sb-out__ic{ width:34px; height:34px; border-radius:var(--radius-sm); background:var(--coral-50); color:var(--coral-600); display:grid; place-items:center; flex:none; }
.sb-out__t{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); }
.sb-out__d{ font-size:11px; color:var(--text-muted); margin-top:2px; }
.sb-out__v{ margin-left:auto; font-family:var(--font-condensed); font-weight:800; font-size:26px; color:var(--text-strong); }
.sb-out__v.pend{ font-size:13px; font-weight:700; color:var(--text-subtle); font-family:var(--font-mono); }
.sb-stat--click{ cursor:pointer; }
.sb-added{ margin:-6px 0 20px; background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); overflow-x:auto; }
.sb-added__loading{ padding:16px 18px; font-size:13px; color:var(--text-muted); }
.sb-added__t{ width:100%; border-collapse:collapse; font-size:13px; }
.sb-added__t th{ text-align:left; font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.08em; font-size:10px; font-weight:700; color:var(--text-subtle); padding:10px 14px; border-bottom:1px solid var(--border-subtle); white-space:nowrap; }
.sb-added__t td{ padding:9px 14px; border-bottom:1px solid var(--border-subtle); color:var(--text-body); white-space:nowrap; }
.sb-added__t tr:last-child td{ border-bottom:none; }
.sb-added__dom{ display:block; font-size:11px; color:var(--text-muted); }
.sb-added__find{ font-size:11px; font-weight:700; padding:5px 10px; border-radius:99px; border:1px solid var(--coral-300); background:var(--coral-50); color:var(--coral-600); cursor:pointer; }
.sb-added__find:disabled{ opacity:.6; cursor:default; }
.sb-added__msg{ display:block; margin-top:5px; font-size:11px; color:var(--text-muted); white-space:normal; }
`;
(function(){ if(document.getElementById("sb-css"))return; const s=document.createElement("style"); s.id="sb-css"; s.textContent=SB_CSS; document.head.appendChild(s); })();

const fmtS = (n) => (n == null ? "—" : n.toLocaleString("en-US"));

function Scoreboard() {
  const [d, setD] = useStateS(null);
  const [showAdded, setShowAdded] = useStateS(false);
  const [added, setAdded] = useStateS(null);
  const [pursuing, setPursuing] = useStateS({});
  const [pursueMsg, setPursueMsg] = useStateS({});
  useEffectS(() => { PES.fetchScoreboard().then(setD).catch(() => setD({})); }, []);

  if (!d) return <div className="pe-page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;

  const openAdded = () => {
    setShowAdded((v) => !v);
    if (!added) PES.fetchAdded().then(setAdded);
  };

  async function findPerson(domain) {
    setPursuing((p) => ({ ...p, [domain]: true }));
    setPursueMsg((m) => ({ ...m, [domain]: "" }));
    try {
      const res = await PES.pursueDomains([domain]);
      const found = (res.pursued && res.pursued[0]) || {};
      if (!res.apollo_configured) setPursueMsg((m) => ({ ...m, [domain]: "Apollo isn't configured yet (set APOLLO_API_KEY)." }));
      else if (!(found.contacts || []).length) setPursueMsg((m) => ({ ...m, [domain]: "No decision-makers found." }));
      else setPursueMsg((m) => ({ ...m, [domain]: `Found ${found.contacts.length} — refreshing…` }));
      // refresh the list so contact_count updates and the button drops off once contacts exist
      const fresh = await PES.fetchAdded(); setAdded(fresh);
    } catch (e) {
      setPursueMsg((m) => ({ ...m, [domain]: String(e.message || e) }));
    } finally {
      setPursuing((p) => { const n = { ...p }; delete n[domain]; return n; });
    }
  }

  const bands = d.by_band || {};
  const bandMax = Math.max(1, ...Object.values(bands));
  const verts = d.top_verticals || [];
  const vertMax = Math.max(1, ...verts.map((v) => v.count));
  const out = d.outcomes || {};
  const OUTCOMES = [
    { ic: "Send", t: "Reached out", d: "Emails + calls logged to perfect-fit firms", v: out.reached_out },
    { ic: "Clock", t: "Meetings booked", d: "Discovery + demos from engine-surfaced firms", v: out.meetings },
    { ic: "Coins", t: "Pipeline generated", d: "Open opportunity value from these accounts", v: out.pipeline_value, money: true },
  ];

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>What the engine produced · watch, not work</div>
          <h2 style={{ margin: "6px 0 0" }}>Engine Impact</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "70ch" }}>
            The value the engine is creating for your pipeline — perfect-fit companies found, added to your CRM, and worked into meetings and revenue.
          </p>
        </div>
      </div>

      <div className="sb-funnel">
        <div className="sb-stat sb-stat--lead">
          <div className="sb-stat__l"><IcoS.Star size={13} /> Perfect-fit found</div>
          <div className="sb-stat__v">{fmtS(d.perfect_fit)}</div>
          <div className="sb-stat__note" style={{ color: "rgba(255,255,255,.7)" }}>A-band, net-new — your highest-probability prospects.</div>
        </div>
        <div className="sb-stat">
          <div className="sb-stat__l"><IcoS.Database size={13} /> Prospects surfaced</div>
          <div className="sb-stat__v">{fmtS(d.surfaced)}</div>
          <div className="sb-stat__note">Scored + ranked through the machine.</div>
        </div>
        <div className="sb-stat">
          <div className="sb-stat__l"><IcoS.Sparkles size={13} /> Net-new</div>
          <div className="sb-stat__v">{fmtS(d.net_new)}</div>
          <div className="sb-stat__note">Not already in your CRM — fresh prospects.</div>
        </div>
        <div className="sb-stat sb-stat--click" onClick={openAdded}>
          <div className="sb-stat__l"><IcoS.CircleCheck size={13} /> Added to CRM</div>
          <div className="sb-stat__v">{fmtS(d.in_crm)}</div>
          <div className="sb-stat__note">Saved to HubSpot as engine-sourced. Click to view.</div>
        </div>
      </div>

      {showAdded && (
        <div className="sb-added">
          {!added ? <div className="sb-added__loading">Loading…</div> : (
            <table className="sb-added__t">
              <thead><tr><th>Company</th><th>Added</th><th>Owner</th><th>Contacts</th><th></th></tr></thead>
              <tbody>
                {added.added.map((r) => (
                  <tr key={r.domain}>
                    <td>{r.name}<span className="sb-added__dom">{r.domain}</span></td>
                    <td>{r.claimed_at ? r.claimed_at.slice(0, 10) : "—"}</td>
                    <td>{r.owner_name || "—"}</td>
                    <td>{r.contact_count ?? 0}</td>
                    <td>
                      {r.contact_count === 0 &&
                        <button className="sb-added__find" disabled={!!pursuing[r.domain]} onClick={() => findPerson(r.domain)}>
                          {pursuing[r.domain] ? "Finding…" : "Find the person"}
                        </button>}
                      {pursueMsg[r.domain] && <span className="sb-added__msg">{pursueMsg[r.domain]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="sb-grid">
        <div className="sb-card">
          <div className="sb-card__h"><IcoS.Route size={16} style={{ color: "var(--coral-500)" }} /><h4>Worked into revenue</h4><span className="pe-overline">from HubSpot</span></div>
          <div className="sb-card__b">
            {OUTCOMES.map((o, i) => {
              const Oi = IcoS[o.ic] || IcoS.Dot;
              const pending = o.v == null;
              return (
                <div className="sb-out" key={i}>
                  <div className="sb-out__ic"><Oi size={16} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sb-out__t">{o.t}</div>
                    <div className="sb-out__d">{o.d}</div>
                  </div>
                  {pending
                    ? <span className="sb-out__v pend">syncing…</span>
                    : <span className="sb-out__v">{o.money ? "$" + fmtS(o.v) : fmtS(o.v)}</span>}
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 12, lineHeight: 1.4 }}>
              These populate from HubSpot activity as your team works the queue — emails, calls, meetings, and deals on engine-surfaced companies.
            </div>
          </div>
        </div>

        <div>
          <div className="sb-card" style={{ marginBottom: 18 }}>
            <div className="sb-card__h"><IcoS.Scale size={16} style={{ color: "var(--coral-500)" }} /><h4>Fit quality</h4><span className="pe-overline">ABCR bands</span></div>
            <div className="sb-card__b">
              {["A", "B", "C", "R"].map((b) => (
                <div className="sb-row" key={b}>
                  <span className="sb-row__k">Band {b}{b === "A" ? " (perfect-fit)" : ""}</span>
                  <span className="sb-track"><i style={{ width: ((bands[b] || 0) / bandMax * 100) + "%", background: BAND_COLOR[b] }} /></span>
                  <span className="sb-row__v">{fmtS(bands[b] || 0)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sb-card">
            <div className="sb-card__h"><IcoS.Building size={16} style={{ color: "var(--coral-500)" }} /><h4>Top verticals surfaced</h4></div>
            <div className="sb-card__b">
              {verts.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No accounts yet.</div>
                : verts.map((v) => (
                  <div className="sb-row" key={v.vertical}>
                    <span className="sb-row__k" style={{ width: 150 }}>{PES.Vertical[v.vertical] || v.vertical}</span>
                    <span className="sb-track"><i style={{ width: (v.count / vertMax * 100) + "%", background: "var(--coral-400)" }} /></span>
                    <span className="sb-row__v">{fmtS(v.count)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PE.Scoreboard = Scoreboard;
