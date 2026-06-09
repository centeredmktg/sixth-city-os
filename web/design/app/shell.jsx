/* ============================================================
   Pipeline Engine — app shell (sidebar + topbar)
   Charcoal sidebar (brand dark panel), stone page surface.
   ============================================================ */
const { Icons } = window.PE;
const { Avatar, Badge } = window.SixthCityMarketingDesignSystem_4d5a9e;

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
  s.id = "pe-shell-css"; s.textContent = SHELL_CSS;
  document.head.appendChild(s);
}
injectShellCSS();

const NAV = [
  { id: "queue", label: "Morning Queue", icon: Icons.Sunrise },
  { id: "triage", label: "Triage Board", icon: Icons.Route },
  { id: "scoreboard", label: "Scoreboard", icon: Icons.Scale },
  { id: "accounts", label: "Accounts", icon: Icons.Building },
];

function Sidebar({ view, onNav, counts }) {
  return (
    <aside className="pe-side">
      <div className="pe-side__brand">
        <img className="pe-side__logo" src="ds/assets/logo-knockout.png" alt="Sixth City Marketing" />
        <div className="pe-side__product">
          <Icons.Cpu size={14} stroke={2.4} />
          <span className="scm-overline">Pipeline Engine</span>
        </div>
      </div>
      <nav className="pe-side__nav">
        <div className="pe-side__label">Workspace</div>
        {NAV.map((n) => {
          const on = view === n.id || (view === "detail" && n.id === "accounts");
          return (
            <button key={n.id} className={"pe-nav" + (on ? " pe-nav--on" : "")} onClick={() => onNav(n.id)}>
              <n.icon size={18} />
              <span>{n.label}</span>
              {counts[n.id] != null && <span className="pe-nav__count">{counts[n.id]}</span>}
            </button>
          );
        })}
      </nav>
      <div className="pe-side__foot">
        <div className="pe-who">
          <Avatar name={window.PE.closer.name} size="sm" tone="coral" status="online" />
          <div>
            <div className="pe-who__name">{window.PE.closer.name}</div>
            <div className="pe-who__role">{window.PE.closer.title}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, right }) {
  return (
    <header className="pe-top">
      <div>
        <div className="pe-top__title">{title}</div>
        {sub && <div className="pe-top__sub">{sub}</div>}
      </div>
      <div className="pe-top__spacer" />
      {right}
      <div className="pe-top__search">
        <Icons.Search size={16} />
        <input placeholder="Search accounts…" />
      </div>
      <button className="pe-iconbtn" title="Notifications">
        <Icons.Bell size={18} />
        <span className="pe-iconbtn__dot" />
      </button>
    </header>
  );
}

window.PE.Sidebar = Sidebar;
window.PE.Topbar = Topbar;
window.PE.NAV = NAV;
