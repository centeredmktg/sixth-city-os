/* ============================================================
   Ingestion Engine — shell + mount. LIVE: refreshes the triage
   stream from /api/candidates on mount and after each import.
   ============================================================ */
const { useState: useStateApp, useEffect: useEffectApp } = React;
const P = window.PE;
const { Avatar: AvatarApp } = window.SixthCityMarketingDesignSystem_4d5a9e;

const APP_CSS = `
.pe-toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px);
  background:var(--ink-900); color:#fff; padding:12px 18px; border-radius:var(--radius-md); box-shadow:var(--shadow-lg);
  display:flex; align-items:center; gap:11px; font-weight:700; font-size:var(--text-sm); z-index:80;
  opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; }
.pe-toast--on{ opacity:1; transform:translateX(-50%) translateY(0); }
.pe-toast svg{ color:var(--green-400); }
.pe-toast b{ color:var(--orange-400); }
.pe-toast--err b{ color:#fff; }
.pe-toast--err svg{ color:var(--coral-400); }
.pe-nav--soon{ opacity:.45; cursor:not-allowed; }
.pe-nav--soon:hover{ background:transparent; }
.pe-nav__soon{ margin-left:auto; font-family:var(--font-mono); font-size:9px; text-transform:uppercase;
  letter-spacing:.06em; color:var(--text-subtle); border:1px solid var(--border-subtle);
  border-radius:99px; padding:1px 7px; }
`;
(function(){ if(document.getElementById("pe-app-css"))return; const s=document.createElement("style"); s.id="pe-app-css"; s.textContent=APP_CSS; document.head.appendChild(s); })();

function Sidebar({ view, onNav, netNew }) {
  const NAV = [
    { id: "ingestion", label: "Ingestion", icon: P.Icons.Database, count: netNew },
    { id: "queue", label: "Morning Queue", icon: P.Icons.Sunrise },
    { id: "triage", label: "Triage Board", icon: P.Icons.Route, count: netNew },
    { id: "scoreboard", label: "Scoreboard", icon: P.Icons.Scale },
    { id: "accounts", label: "Accounts", icon: P.Icons.Building },
  ];
  return (
    <aside className="pe-side">
      <div className="pe-side__brand">
        <img className="pe-side__logo" src="ds/assets/logo-knockout.png" alt="Sixth City Marketing" />
        <div className="pe-side__product">
          <P.Icons.Cpu size={14} stroke={2.4} />
          <span className="scm-overline">Pipeline Engine</span>
        </div>
      </div>
      <nav className="pe-side__nav">
        <div className="pe-side__label">Workspace</div>
        {NAV.map((n) => {
          const on = view === n.id;
          // Unbuilt screens are disabled with a "soon" pill — visible (so the roadmap
          // reads) but non-navigable, so the nav never dead-ends on a blank screen.
          if (n.soon) {
            return (
              <button key={n.id} className="pe-nav pe-nav--soon" disabled title="Coming soon">
                <n.icon size={18} />
                <span>{n.label}</span>
                <span className="pe-nav__soon">soon</span>
              </button>
            );
          }
          return (
            <button key={n.id} className={"pe-nav" + (on ? " pe-nav--on" : "")} onClick={() => onNav(n.id)}>
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.count != null && <span className="pe-nav__count">{n.count}</span>}
            </button>
          );
        })}
      </nav>
      <div className="pe-side__foot">
        <div className="pe-who">
          <AvatarApp name={P.danny.name} size="sm" tone="orange" status="online" />
          <div>
            <div className="pe-who__name">{P.danny.name}</div>
            <div className="pe-who__role">{P.danny.title}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, sub }) {
  return (
    <header className="pe-top">
      <div>
        <div className="pe-top__title">{title}</div>
        {sub && <div className="pe-top__sub">{sub}</div>}
      </div>
      <div className="pe-top__spacer" />
      <div className="pe-top__search">
        <P.Icons.Search size={16} />
        <input placeholder="Search accounts…" />
      </div>
      <button className="pe-iconbtn" title="Notifications">
        <P.Icons.Bell size={18} />
        <span className="pe-iconbtn__dot" />
      </button>
    </header>
  );
}

// Deep-linkable routes — each nav view has a persistent URL (bookmark/refresh/back work).
const VIEW_PATH = { ingestion: "/", queue: "/queue", triage: "/triage", scoreboard: "/scoreboard", accounts: "/accounts" };
const PATH_VIEW = { "/": "ingestion", "/ingestion": "ingestion", "/queue": "queue", "/triage": "triage", "/scoreboard": "scoreboard", "/accounts": "accounts" };
const viewFromPath = () => PATH_VIEW[window.location.pathname] || "ingestion";

function App() {
  const [view, setView] = useStateApp(viewFromPath());   // initial view from the URL
  const [mode, setMode] = useStateApp("run");   // run | import
  const [toast, setToast] = useStateApp(null);
  const [tick, setTick] = useStateApp(0);        // bump to re-render after a live refresh

  // initial load — pull the live triage stream
  useEffectApp(() => { P.refresh().then(() => setTick((t) => t + 1)); }, []);

  useEffectApp(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffectApp(() => { document.querySelector(".pe-scroll")?.scrollTo(0, 0); }, [mode, view]);

  // Back/forward + direct-URL: keep the view in sync with the address bar.
  useEffectApp(() => {
    const onPop = () => setView(viewFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const finishImport = async (result) => {
    await P.refresh();
    setMode("run");
    setTick((t) => t + 1);
    const r = result || {};
    setToast({ msg: <span>Ingest complete — <b>{(r.scored ?? P.RUN.netNew) || 0}</b> firms scored, ranked on the board</span> });
  };

  const importError = (err) => setToast({ err: true, msg: <span>Ingest failed — {String(err.message || err)}</span> });

  const triageConfirmed = (n) => {
    P.refresh().then(() => setTick((t) => t + 1));
    setToast({ msg: <span><b>{n}</b> confirmed → pushed to HubSpot</span> });
  };
  const pushError = (err) => setToast({ err: true, msg: <span>Push failed — {String(err.message || err)}</span> });

  const nav = (v) => {
    setView(v); setMode("run");
    const path = VIEW_PATH[v] || "/";
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  };
  const importing = mode === "import";
  const titles = {
    queue: ["Morning Queue", "Start here — today's highest-priority net-new to work"],
    triage: ["Triage Board", "Confirm or override routing — the human-in-the-loop gate"],
    accounts: ["Accounts", "The book — every scored account + its evidence trail"],
    scoreboard: ["Engine Impact", "What the engine is producing for your pipeline"],
    ingestion: ["Ingestion Engine", "Where every account enters the pipeline"],
  };
  const [title, sub] = importing
    ? ["Import a list", "Run a Clay export — or any CSV — through the machine"]
    : (titles[view] || titles.ingestion);

  return (
    <div className="pe-app">
      <Sidebar view={view} onNav={nav} netNew={P.RUN.netNew} />
      <div className="pe-main">
        <Topbar title={title} sub={sub} />
        <div className="pe-scroll">
          {importing
            ? <P.FileImporter onCancel={() => setMode("run")} onComplete={finishImport} onError={importError} />
            : view === "queue"
              ? <P.MorningQueue onConfirmed={triageConfirmed} onError={pushError} />
            : view === "triage"
              ? <P.TriageBoard onConfirmed={triageConfirmed} onError={pushError} />
            : view === "accounts"
              ? <P.AccountsScreen />
            : view === "scoreboard"
              ? <P.Scoreboard />
              : <P.IngestionEngine onSendToScoring={() => {}} onRunIngest={() => setMode("import")} />}
        </div>
      </div>
      <div className={"pe-toast" + (toast ? " pe-toast--on" : "") + (toast && toast.err ? " pe-toast--err" : "")}>
        {toast && <React.Fragment><P.Icons.CheckCheck size={17} />{toast.msg}</React.Fragment>}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("pe-root")).render(<App />);
