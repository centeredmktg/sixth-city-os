/* ============================================================
   Triage Board — the human-in-the-loop routing gate.
   Net-new firms arrive scored + routed; the operator confirms
   the obvious in bulk and single-out the judgment calls.
   Confirming a Closer pushes it into HubSpot (server re-checks
   net-new at claim time). LIVE: reads PE.STREAM, posts /api/push.
   ============================================================ */
const { useState: useStateT, useMemo: useMemoT } = React;
const PET = window.PE;
const IcoT = PET.Icons;
const { Badge: BadgeT, Button: BtnT } = window.SixthCityMarketingDesignSystem_4d5a9e;

const GATE = 55;   // timing >= GATE => in-market => closer-bound (mirrors engine routing)

// Toggle order is coldest -> warmest, then reject (out): Hold | Nurture | LFG | Reject.
// "LFG" is the display label for the `closer` route (key unchanged — routing/push logic
// keys off 'closer' everywhere; this is purely what the operator sees).
const ROUTES = [
  { key: "hold",    label: "Hold" },
  { key: "nurture", label: "Nurture" },
  { key: "closer",  label: "LFG" },
  { key: "reject",  label: "Reject" },
];
const ROUTE_TONE = { closer: "green", nurture: "warning", hold: "neutral", reject: "danger" };
const ROUTE_DOT  = { closer: "var(--green-500)", nurture: "var(--orange-400)", hold: "var(--stone-400)", reject: "var(--coral-500)" };
const ROUTE_BLURB = {
  closer:  "in-market now",
  nurture: "good fit, not in-market",
  hold:    "weak on both — revisit later",
  reject:  "not a fit — out",
};

const TG_CSS = `
.tg-grid{ display:grid; grid-template-columns:1fr 340px; gap:22px; align-items:start; margin-top:20px; }
@media (max-width:1100px){ .tg-grid{ grid-template-columns:1fr; } }
.tg-overline{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.14em; font-size:11px; font-weight:800; color:var(--coral-600); }
.tg-bar{ display:flex; align-items:center; gap:13px; padding:13px 18px; margin:18px 0; background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-md); box-shadow:var(--shadow-xs); }
.tg-bar__t{ font-size:var(--text-sm); color:var(--text-body); }
.tg-bar__t b{ color:var(--text-strong); }
.tg-bar__sp{ margin-left:auto; }
.tg-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-sm); padding:16px 18px; margin-bottom:12px; display:grid;
  grid-template-columns:1.5fr 1.3fr auto; gap:18px; align-items:center; }
.tg-card--done{ background:var(--surface-cream); border-color:var(--green-200); }
.tg-card__nm{ font-weight:800; font-size:var(--text-md); color:var(--text-strong); }
.tg-card__meta{ font-size:11px; color:var(--text-muted); margin-top:2px; }
.tg-card__why{ font-size:12px; margin-top:6px; display:flex; align-items:center; gap:6px; }
.tg-card__why b{ color:var(--text-strong); }
.tg-metrics{ display:flex; flex-direction:column; gap:7px; min-width:0; }
.tg-metric{ display:flex; align-items:center; gap:9px; }
.tg-metric__k{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle); width:34px; flex:none; }
.tg-track{ flex:1; height:7px; border-radius:99px; background:var(--stone-150); overflow:hidden; min-width:60px; }
.tg-fill{ height:100%; border-radius:99px; }
.tg-metric__v{ font-family:var(--font-condensed); font-weight:800; font-size:14px; color:var(--text-strong); width:30px; text-align:right; flex:none; }
.tg-act{ display:flex; flex-direction:column; gap:10px; align-items:flex-end; min-width:200px; }
.tg-seg{ display:inline-flex; border:1px solid var(--border-default); border-radius:var(--radius-sm); overflow:hidden; }
.tg-seg button{ border:none; background:var(--surface-card); padding:5px 10px; font-size:11px; font-weight:700; color:var(--text-muted); cursor:pointer; border-right:1px solid var(--border-subtle); }
.tg-seg button:last-child{ border-right:none; }
.tg-seg button.on{ background:var(--ink-700); color:#fff; }
.tg-done{ display:flex; align-items:center; gap:7px; font-weight:800; font-size:var(--text-sm); color:var(--green-600); }
.tg-side{ position:sticky; top:16px; background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:18px; }
.tg-side h4{ margin:0 0 4px; font-size:var(--text-lg); }
.tg-side__sub{ font-size:12px; color:var(--text-muted); margin-bottom:14px; line-height:1.4; }
.tg-plot{ position:relative; width:100%; aspect-ratio:1.1/1; background:var(--surface-cream); border-radius:var(--radius-md); border:1px solid var(--border-subtle); overflow:hidden; }
.tg-legend{ margin-top:14px; display:flex; flex-direction:column; gap:8px; }
.tg-leg{ display:flex; align-items:center; gap:9px; font-size:12px; }
.tg-leg__dot{ width:9px; height:9px; border-radius:50%; flex:none; }
.tg-leg__lab{ color:var(--text-body); }
.tg-leg__sub{ color:var(--text-subtle); }
.tg-leg__n{ margin-left:auto; font-family:var(--font-condensed); font-weight:800; color:var(--text-strong); }
.tg-empty{ text-align:center; padding:50px 20px; color:var(--text-muted); }
`;
(function(){ if(document.getElementById("tg-css"))return; const s=document.createElement("style"); s.id="tg-css"; s.textContent=TG_CSS; document.head.appendChild(s); })();

function heatColor(v) {
  if (v >= 70) return "var(--green-500)";
  if (v >= GATE) return "var(--orange-400)";
  return "var(--stone-400)";
}

function FitTimingScatter({ rows, routeOf }) {
  // x = fit (0-100), y = timing (0-100, inverted for SVG). Gate line at timing=GATE.
  const W = 300, H = 270, pad = 14;
  const px = (fit) => pad + (fit / 100) * (W - 2 * pad);
  const py = (tim) => pad + (1 - tim / 100) * (H - 2 * pad);
  const gateY = py(GATE);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <rect x="0" y="0" width={W} height={gateY} fill="rgba(237,106,60,.06)" />
      <line x1="0" y1={gateY} x2={W} y2={gateY} stroke="var(--coral-400)" strokeWidth="1" strokeDasharray="4 3" />
      <text x={W - 6} y={gateY - 5} textAnchor="end" fontSize="9" fill="var(--coral-600)" fontFamily="var(--font-mono)">timing {GATE}</text>
      {rows.map((a, i) => (
        <circle key={a.domain || i} cx={px(a.fit || 0)} cy={py(a.timing || 0)} r="4.5"
          fill={ROUTE_DOT[routeOf(a)] || "var(--stone-400)"} fillOpacity="0.85" />
      ))}
      <text x={pad} y={H - 3} fontSize="9" fill="var(--text-subtle)" fontFamily="var(--font-mono)">fit →</text>
    </svg>
  );
}

function TriageBoard({ onConfirmed, onError }) {
  // Actionable prospects only — in-book firms aren't routed (existing accounts).
  const all = useMemoT(() => PET.STREAM.filter((a) => a.dedupe !== "merged"), [PET.STREAM]);
  const [overrides, setOverrides] = useStateT({});   // domain -> route key (operator override)
  const [confirmed, setConfirmed] = useStateT({});    // domain -> true (pushed)
  const [busy, setBusy] = useStateT(false);

  const routeOf = (a) => overrides[a.domain] || a.route || "nurture";
  const setRoute = (domain, key) => setOverrides((o) => ({ ...o, [domain]: key }));

  const awaiting = all.filter((a) => !confirmed[a.domain]);
  const counts = ROUTES.reduce((m, r) => (m[r.key] = all.filter((a) => routeOf(a) === r.key).length, m), {});
  const obvious = awaiting.filter((a) => routeOf(a) === "closer" && a.band === "A").map((a) => a.domain);

  async function confirm(domains) {
    const list = domains.filter((d) => !confirmed[d]);
    if (!list.length || busy) return;
    setBusy(true);
    try {
      await PET.pushDomains(list);
      setConfirmed((c) => { const n = { ...c }; list.forEach((d) => (n[d] = true)); return n; });
      await PET.refresh();
      onConfirmed && onConfirmed(list.length);
    } catch (e) {
      onError && onError(e);
    } finally { setBusy(false); }
  }

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="tg-overline">Human-in-the-loop · confirm or override routing</div>
          <h2 style={{ margin: "6px 0 0" }}>{awaiting.length} to confirm before anything acts</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "70ch" }}>
            Nothing enters a closer sequence unconfirmed. The engine recommends; you confirm the obvious in
            bulk and single out the judgment calls. Confirming a Closer pushes it into HubSpot.
          </p>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="tg-empty">
          <IcoT.Route size={30} style={{ color: "var(--stone-400)" }} />
          <p>No net-new prospects to triage yet. Ingest a list, then they land here ranked and routed.</p>
        </div>
      ) : (
        <React.Fragment>
          <div className="tg-bar">
            <IcoT.ShieldCheck size={18} style={{ color: "var(--green-600)" }} />
            <div className="tg-bar__t"><b>{awaiting.length}</b> awaiting your call · <b>{Object.keys(confirmed).length}</b> confirmed</div>
            <div className="tg-bar__sp" />
            <BtnT variant="primary" size="sm" icon={<IcoT.Zap size={14} />}
              disabled={busy || !obvious.length} onClick={() => confirm(obvious)}>
              {busy ? "Confirming…" : `Bulk-confirm ${obvious.length} obvious (A → LFG)`}
            </BtnT>
          </div>

          <div className="tg-grid">
            <div>
              {all.map((a) => {
                const r = routeOf(a);
                const done = confirmed[a.domain];
                return (
                  <div className={"tg-card" + (done ? " tg-card--done" : "")} key={a.domain}>
                    <div>
                      <div className="tg-card__nm">{a.name}</div>
                      <div className="tg-card__meta">{a.domain} · {PET.Vertical[a.vertical] || a.vertical}{a.city ? " · " + a.city : ""}</div>
                      <div className="tg-card__why">
                        {a.inMarket === "confirmed"
                          ? <BadgeT tone="green" variant="soft" size="sm" dot>In-market</BadgeT>
                          : <BadgeT tone="neutral" variant="soft" size="sm">In-market: unknown</BadgeT>}
                        <span style={{ color: "var(--text-muted)" }}>
                          {a.inMarket === "confirmed"
                            ? (a.inMarketWhy || "active buying signal")
                            : "no buying signal yet — qualify (a human sets “not now”)"}
                        </span>
                      </div>
                    </div>

                    <div className="tg-metrics">
                      <div className="tg-metric">
                        <span className="tg-metric__k">FIT</span>
                        <span className="tg-track"><span className="tg-fill" style={{ width: (a.fit || 0) + "%", background: "var(--stone-400)" }} /></span>
                        <span className="tg-metric__v">{Math.round(a.fit || 0)}</span>
                      </div>
                      <div className="tg-metric">
                        <span className="tg-metric__k">TIME</span>
                        <span className="tg-track"><span className="tg-fill" style={{ width: (a.timing || 0) + "%", background: heatColor(a.timing || 0) }} /></span>
                        <span className="tg-metric__v">{Math.round(a.timing || 0)}</span>
                      </div>
                    </div>

                    <div className="tg-act">
                      {done ? (
                        <div className="tg-done"><IcoT.CheckCheck size={16} /> Pushed to HubSpot</div>
                      ) : (
                        <React.Fragment>
                          <div className="tg-seg">
                            {ROUTES.map((x) => (
                              <button key={x.key} className={r === x.key ? "on" : ""} onClick={() => setRoute(a.domain, x.key)}>{x.label}</button>
                            ))}
                          </div>
                          {r === "closer"
                            ? <BtnT variant="primary" size="sm" icon={<IcoT.Check size={14} />} disabled={busy} onClick={() => confirm([a.domain])}>Confirm LFG</BtnT>
                            : <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{r === "reject" ? "won't be worked" : "marketing track — no push"}</span>}
                        </React.Fragment>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tg-side">
              <h4>Fit × Timing</h4>
              <div className="tg-side__sub">Fit × timing scores for ranking. In-market is confirmed by a real buying signal — not a timing cutoff.</div>
              <div className="tg-plot"><FitTimingScatter rows={all} routeOf={routeOf} /></div>
              <div className="tg-legend">
                {ROUTES.map((x) => (
                  <div className="tg-leg" key={x.key}>
                    <span className="tg-leg__dot" style={{ background: ROUTE_DOT[x.key] }} />
                    <span className="tg-leg__lab">{x.label}</span>
                    <span className="tg-leg__sub">{ROUTE_BLURB[x.key]}</span>
                    <span className="tg-leg__n">{counts[x.key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

window.PE.TriageBoard = TriageBoard;
