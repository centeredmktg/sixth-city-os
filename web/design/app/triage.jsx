/* ============================================================
   Screen 2 — Triage / Routing Board (the HITL gate)
   A decision queue: confirm or override the engine's routing
   before anything acts. Timing-first. fit×timing shown as a
   tiny 2-axis read so the override call is visual.
   ============================================================ */
const { useState: useStateT, useMemo: useMemoT } = React;
const PET = window.PE;
const { Button: BtnT, Badge: BadgeT } = window.SixthCityMarketingDesignSystem_4d5a9e;
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
(function(){ if(document.getElementById("pe-triage-css"))return; const s=document.createElement("style"); s.id="pe-triage-css"; s.textContent=TRIAGE_CSS; document.head.appendChild(s); })();

const ROUTE_OPTS = ["closer", "nurture", "hold", "reject"];
const routeColor = { closer: "var(--coral-500)", nurture: "var(--heat-cool)", hold: "var(--stone-500)", reject: "var(--stone-400)" };

function Scatter({ rows, decisions, hover, setHover }) {
  const W = 296, H = 230, padL = 34, padB = 30, padT = 10, padR = 10;
  const xd = [50, 100], yd = [0, 100];
  const px = (f) => padL + ((f - xd[0]) / (xd[1] - xd[0])) * (W - padL - padR);
  const py = (t) => H - padB - ((t - yd[0]) / (yd[1] - yd[0])) * (H - padT - padB);
  const gateY = py(PET.IN_MARKET_TIMING);
  const fitX = px(PET.VIABLE_FIT);
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {/* nurture/closer zone shading */}
      <rect x={padL} y={padT} width={W-padL-padR} height={gateY-padT} fill="var(--coral-500)" opacity="0.05" />
      <rect x={fitX} y={gateY} width={W-padR-fitX} height={H-padB-gateY} fill="var(--heat-cool)" opacity="0.06" />
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={H-padB} stroke="var(--border-default)" />
      <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} stroke="var(--border-default)" />
      {/* gate line: timing = 55 */}
      <line x1={padL} y1={gateY} x2={W-padR} y2={gateY} stroke="var(--ink-700)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
      <text x={W-padR} y={gateY-5} textAnchor="end" fontSize="9" fill="var(--ink-700)" fontWeight="700" fontFamily="var(--font-condensed)" letterSpacing="0.08em">IN-MARKET GATE · 55</text>
      {/* viable-fit line */}
      <line x1={fitX} y1={gateY} x2={fitX} y2={H-padB} stroke="var(--stone-400)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      {/* axis labels */}
      <text x={(padL+W-padR)/2} y={H-8} textAnchor="middle" fontSize="10" fill="var(--text-subtle)" fontWeight="700" fontFamily="var(--font-condensed)" letterSpacing="0.1em">FIT →</text>
      <text x={12} y={(padT+H-padB)/2} textAnchor="middle" fontSize="10" fill="var(--text-subtle)" fontWeight="700" fontFamily="var(--font-condensed)" letterSpacing="0.1em" transform={`rotate(-90 12 ${(padT+H-padB)/2})`}>TIMING →</text>
      {/* points */}
      {rows.map((a) => {
        const eff = decisions[a.id]?.route || a.route.recommended;
        const isH = hover === a.id;
        return (
          <circle key={a.id} className="t-dot" cx={px(a.score.fit)} cy={py(a.score.timing)} r={isH ? 8 : 5.5}
            fill={routeColor[eff]} stroke="#fff" strokeWidth="1.5" opacity={hover && !isH ? 0.4 : 0.95}
            onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)} />
        );
      })}
    </svg>
  );
}

function Axis({ k, v, color, gate }) {
  return (
    <div className="t-axis">
      <span className="t-axis__k">{k}</span>
      <div className="t-axis__track">
        <div className="t-axis__fill" style={{ width: v + "%", background: color }} />
        {gate != null && <span className="t-axis__gate" style={{ left: gate + "%" }} />}
      </div>
      <span className="t-axis__v">{Math.round(v)}</span>
    </div>
  );
}

function TriageRow({ a, decision, onDecide, onOpen, hover, setHover }) {
  const eff = decision?.route || (a.route.confirmed ? a.route.effective : null);
  const done = !!decision || a.route.confirmed;
  const recColor = routeColor[a.route.recommended];
  const overridden = done && eff !== a.route.recommended;
  return (
    <div className={"t-row" + (hover === a.id ? " t-row--hl" : "") + (done ? " t-row--done" : "")}
      onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)}>
      <div className="t-rec">
        <div className="t-rec__top">
          <span className="t-rec__name" onClick={() => onOpen(a.id)}>{a.name}</span>
          <span className="t-rec__vert">{PET.Vertical[a.vertical]} · {a.city}, {a.state}</span>
        </div>
        <div className="t-rec__why">
          <IcoT.Route size={13} />
          <span><b style={{ color: recColor, fontWeight: 800 }}>{PET.RouteLabel[a.route.recommended]}</b> — {a.route.rationale}</span>
        </div>
      </div>

      <div className="t-axes">
        <Axis k="Fit" v={a.score.fit} color="var(--stone-500)" gate={PET.VIABLE_FIT} />
        <Axis k="Time" v={a.score.timing} color={a.score.timing >= PET.IN_MARKET_TIMING ? "var(--coral-500)" : "var(--heat-cool)"} gate={PET.IN_MARKET_TIMING} />
      </div>

      <div className="t-ctrl">
        {!done ? (
          <React.Fragment>
            <div className="t-seg" role="group" aria-label="route">
              {ROUTE_OPTS.map((r) => (
                <button key={r} className={r === a.route.recommended ? "on" : ""} onClick={() => onDecide(a.id, r)} title={"Route to " + PET.RouteLabel[r]}>
                  {PET.RouteLabel[r]}
                </button>
              ))}
            </div>
            <BtnT variant="positive" size="sm" block icon={<IcoT.Check size={14} />} onClick={() => onDecide(a.id, a.route.recommended)}>
              Confirm {PET.RouteLabel[a.route.recommended]}
            </BtnT>
          </React.Fragment>
        ) : (
          <div className="t-confirmed">
            <BadgeT tone={overridden ? "warning" : "green"} dot icon={overridden ? <IcoT.Pencil size={12} /> : <IcoT.CheckCheck size={12} />}>
              {overridden ? "Overridden → " : "Confirmed → "}{PET.RouteLabel[eff]}
            </BadgeT>
            <span className="t-confirmed__by">{(decision?.by) || a.route.confirmed_by}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TriageBoard({ onOpen }) {
  const seed = useMemoT(() => {
    const d = {};
    for (const a of PET.BATCH) if (a.route.confirmed) d[a.id] = { route: a.route.effective, by: a.route.confirmed_by };
    return d;
  }, []);
  const [decisions, setDecisions] = useStateT(seed);
  const [hover, setHover] = useStateT(null);

  const decide = (id, route) => setDecisions((d) => ({ ...d, [id]: { route, by: "J. Sammon · just now" } }));
  const confirmObvious = () => setDecisions((d) => {
    const nd = { ...d };
    for (const a of PET.BATCH) if (!nd[a.id] && a.route.recommended === "closer" && a.score.band === "A") nd[a.id] = { route: "closer", by: "J. Sammon" };
    return nd;
  });

  const pending = PET.BATCH.filter((a) => !decisions[a.id]);
  const obvious = PET.BATCH.filter((a) => !decisions[a.id] && a.route.recommended === "closer" && a.score.band === "A");

  const rollup = ROUTE_OPTS.map((r) => ({
    r, n: PET.BATCH.filter((a) => (decisions[a.id]?.route || a.route.recommended) === r).length,
  }));

  return (
    <div className="pe-page">
      <div className="q-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>Batch scored {PET.today} · 06:00 ET</div>
          <h2 style={{ margin: "6px 0 0" }}>{PET.BATCH.length} accounts routed — confirm before anything acts</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", maxWidth: "62ch" }}>
            Nothing enters a closer sequence unconfirmed. The engine recommends; you confirm the obvious in bulk and single out the judgment calls.
          </p>
        </div>
      </div>

      <div className="t-bar">
        <IcoT.ShieldCheck size={18} style={{ color: "var(--green-600)" }} />
        <span className="t-bar__txt"><b>{pending.length}</b> awaiting your call · <b>{PET.BATCH.length - pending.length}</b> confirmed</span>
        <div className="t-bar__acts">
          <BtnT variant="secondary" size="sm" icon={<IcoT.Zap size={14} />} onClick={confirmObvious} disabled={!obvious.length}>
            Bulk-confirm {obvious.length} obvious (A → closer)
          </BtnT>
        </div>
      </div>

      <div className="t-grid">
        <div className="t-rows">
          {PET.BATCH.map((a) => (
            <TriageRow key={a.id} a={a} decision={decisions[a.id]} onDecide={decide} onOpen={onOpen} hover={hover} setHover={setHover} />
          ))}
        </div>

        <div className="t-panel">
          <h4>Fit × Timing</h4>
          <p className="t-panel__sub">Timing trumps fit. Above the gate → closer; good-fit but cold → nurture.</p>
          <Scatter rows={PET.BATCH} decisions={decisions} hover={hover} setHover={setHover} />
          <div className="t-legend">
            {rollup.map((x) => (
              <div className="t-leg" key={x.r} onMouseEnter={() => setHover(null)}>
                <span className="t-leg__sw" style={{ background: routeColor[x.r] }} />
                <span style={{ fontWeight: 700 }}>{PET.RouteLabel[x.r]}</span>
                <span style={{ color: "var(--text-subtle)" }}>{x.r === "closer" ? "in-market now" : x.r === "nurture" ? "good fit, cold" : x.r === "hold" ? "revisit later" : "out"}</span>
                <span className="t-leg__c">{x.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.PE.TriageBoard = TriageBoard;
