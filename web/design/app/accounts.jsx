/* ============================================================
   Accounts — directory table (the home for Account Detail)
   Every account the engine is tracking, filterable, click → detail.
   ============================================================ */
const { useState: useStateA } = React;
const PEA = window.PE;
const { Badge: BadgeA } = window.SixthCityMarketingDesignSystem_4d5a9e;
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
(function(){ if(document.getElementById("pe-ac-css"))return; const s=document.createElement("style"); s.id="pe-ac-css"; s.textContent=AC_CSS; document.head.appendChild(s); })();

const STAGE_TONE = { discovered: "neutral", scored: "neutral", routed: "info", pushed: "coral", engaged: "green", opportunity: "warning", closed_won: "green", closed_lost: "neutral" };

function Accounts({ onOpen }) {
  const [tab, setTab] = useStateA("all");
  const tabs = [
    { id: "all", label: "All" },
    { id: "closer", label: "Closer queue" },
    { id: "routed", label: "Awaiting triage" },
    { id: "nurture", label: "Nurture" },
  ];
  const list = PEA.ACCOUNTS.filter((a) => {
    if (tab === "all") return true;
    if (tab === "routed") return a.stage === "routed" && !a.route.confirmed;
    return a.route.effective === tab;
  }).sort((a, b) => b.score.total - a.score.total);

  return (
    <div className="pe-page">
      <div className="q-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>Directory</div>
          <h2 style={{ margin: "6px 0 0" }}>Accounts</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>Every net-new account the engine is tracking. Click any row for the full evidence trail.</p>
        </div>
      </div>

      <div className="ac-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={"q-chip" + (tab === t.id ? " q-chip--on" : "")} onClick={() => setTab(t.id)}>
            {t.label} <span className="q-chip__c">{PEA.ACCOUNTS.filter((a) => t.id === "all" ? true : t.id === "routed" ? (a.stage === "routed" && !a.route.confirmed) : a.route.effective === t.id).length}</span>
          </button>
        ))}
      </div>

      <table className="ac-table">
        <thead>
          <tr>
            <th>Band</th><th>Account</th><th>Vertical</th><th>Location</th>
            <th className="r">Fit</th><th className="r">Timing</th><th className="r">Score</th>
            <th>Route</th><th>Stage</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id} onClick={() => onOpen(a.id)}>
              <td><span className="ac-band" style={{ background: PEA.bandColor[a.score.band] }}>{a.score.band}</span></td>
              <td><div className="ac-name">{a.name}</div><div className="ac-name__d">{a.domain}</div></td>
              <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{PEA.Vertical[a.vertical]}</td>
              <td style={{ color: "var(--text-muted)" }}>{a.city}, {a.state}</td>
              <td className="ac-num">{a.score.fit}</td>
              <td className="ac-num" style={{ color: a.score.timing >= PEA.IN_MARKET_TIMING ? "var(--coral-600)" : "var(--text-body)" }}>{a.score.timing}</td>
              <td className="ac-num" style={{ fontWeight: 700, color: PEA.bandColor[a.score.band] }}>{a.score.total}</td>
              <td><BadgeA tone={PEA.routeTone[a.route.effective]} size="sm">{PEA.RouteLabel[a.route.effective]}</BadgeA></td>
              <td><BadgeA tone={STAGE_TONE[a.stage]} variant="soft" size="sm" dot>{a.stage.replace("_", "-")}</BadgeA></td>
              <td><IcoA.ChevronRight size={16} className="ac-chev" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

window.PE.Accounts = Accounts;
