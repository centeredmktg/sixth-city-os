/* ============================================================
   Screen 1 — Morning Queue (the closer's daily surface)
   A prioritized stack of confirmed, in-market, net-new accounts.
   Band color + "why now" do the triage at a glance.
   ============================================================ */
const { useState: useStateQ } = React;
const PEQ = window.PE;
const { Button: BtnQ, Badge: BadgeQ } = window.SixthCityMarketingDesignSystem_4d5a9e;
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
(function(){ if(document.getElementById("pe-queue-css"))return; const s=document.createElement("style"); s.id="pe-queue-css"; s.textContent=QUEUE_CSS; document.head.appendChild(s); })();

function timingPct(t){ return Math.round(t); }

function QueueCard({ a, rank, onOpen, onAction }) {
  const tone = PEQ.bandTone[a.score.band];
  const color = PEQ.bandColor[a.score.band];
  const strongest = a.signals.slice().sort((x, y) => (y.kind==="site_quality"?100-y.value:y.value) - (x.kind==="site_quality"?100-x.value:x.value))[0];
  const engaged = a.stage === "engaged";
  return (
    <div className={"q-card" + (rank === 1 ? " q-card--lead" : "")}>
      <div className="q-tile" style={{ background: PEQ.tierFor(a.score.total).color + "14" }}>
        <span className="q-tile__rank">{String(rank).padStart(2, "0")}</span>
        <span className="q-tile__band" style={{ color }}>{a.score.band}</span>
        <span className="q-tile__score">{a.score.total}</span>
      </div>

      <div className="q-body" onClick={() => onOpen(a.id)}>
        <div className="q-body__top">
          <span className="q-name">{a.name}</span>
          <span className="q-meta"><IcoQ.MapPin size={13} />{a.city}, {a.state}</span>
          <span className="q-meta"><span className="sep">·</span>{PEQ.Vertical[a.vertical]}</span>
          <span style={{ marginLeft: "auto" }}>
            {engaged
              ? <BadgeQ tone="green" dot>Engaged · live</BadgeQ>
              : <BadgeQ tone="neutral" dot>In sequence</BadgeQ>}
          </span>
        </div>
        <div className="q-why">
          <span className="q-why__ico"><IcoQ.Zap size={15} /></span>
          <span className="q-why__txt">{strongest.detail}</span>
        </div>
        <div className="q-draft">
          <IcoQ.Mail size={15} />
          <span className="q-draft__subj">{a.outreach.subject}</span>
          <span className="q-draft__tag"><BadgeQ tone="coral" variant="outline" size="sm" overline>Drafted</BadgeQ></span>
        </div>
      </div>

      <div className="q-rail">
        <div className="q-rail__stage">
          <span className="pe-overline">Timing</span>
          <span className="pe-mono" style={{ fontWeight: 700, color }}>{timingPct(a.score.timing)}/100</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "var(--stone-200)", overflow: "hidden", marginBottom: 2 }}>
          <div style={{ height: "100%", width: timingPct(a.score.timing) + "%", background: color, borderRadius: 99 }} />
        </div>
        <span className="q-rail__hs"><IcoQ.External size={12} /> {a.hubspot_id}</span>
        <div className="q-acts">
          <BtnQ variant="dark" size="sm" block icon={<IcoQ.Phone size={14} />} onClick={() => onAction("call", a)}>Open in HubSpot</BtnQ>
          <div className="q-acts__row">
            <BtnQ variant="secondary" size="sm" block icon={<IcoQ.LogTouch size={14} />} onClick={() => onAction("touch", a)}>Log touch</BtnQ>
            <BtnQ variant="ghost" neutral size="sm" icon={<IcoQ.Route size={14} />} onClick={() => onAction("nurture", a)} title="Kick back to nurture" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MorningQueue({ onOpen, onAction }) {
  const [filter, setFilter] = useStateQ("all");
  const all = PEQ.QUEUE;
  const engaged = all.filter((a) => a.stage === "engaged");
  const bandA = all.filter((a) => a.score.band === "A");
  const shown = filter === "engaged" ? engaged : filter === "a" ? bandA : all;

  const chips = [
    { id: "all", label: "All ready", c: all.length },
    { id: "engaged", label: "Engaged", c: engaged.length },
    { id: "a", label: "Band A", c: bandA.length },
  ];

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>{PEQ.today} · Good morning, {PEQ.closer.name.split(" ")[0]}</div>
          <h2 style={{ margin: "6px 0 0" }}>Your queue is ready — {all.length} accounts to work</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", maxWidth: "56ch" }}>
            Confirmed, in-market, net-new. No prospecting from scratch — start at the top and work down.
          </p>
        </div>
        <div className="q-head__metrics">
          <div className="q-metric">
            <span className="q-metric__n">{all.length}</span>
            <span className="q-metric__l">In queue</span>
          </div>
          <div className="q-metric">
            <span className="q-metric__n">{engaged.length}</span>
            <span className="q-metric__l">Live now</span>
          </div>
          <div className="q-metric">
            <span className="q-metric__n">{bandA.length}<span className="u">·A</span></span>
            <span className="q-metric__l">Top band</span>
          </div>
        </div>
      </div>

      <div className="q-filters">
        {chips.map((c) => (
          <button key={c.id} className={"q-chip" + (filter === c.id ? " q-chip--on" : "")} onClick={() => setFilter(c.id)}>
            {c.label} <span className="q-chip__c">{c.c}</span>
          </button>
        ))}
        <span className="q-sortnote"><IcoQ.TrendingUp size={15} /> Sorted by score — highest intent first</span>
      </div>

      <div className="q-list">
        {shown.map((a, i) => (
          <QueueCard key={a.id} a={a} rank={all.indexOf(a) + 1} onOpen={onOpen} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}

window.PE.MorningQueue = MorningQueue;
