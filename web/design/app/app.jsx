/* ============================================================
   Pipeline Engine — root app (nav state, screen router, toast)
   ============================================================ */
const { useState: useStateApp, useEffect: useEffectApp } = React;
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
(function(){ if(document.getElementById("pe-app-css"))return; const s=document.createElement("style"); s.id="pe-app-css"; s.textContent=APP_CSS; document.head.appendChild(s); })();

const TITLES = {
  queue:      { title: "Morning Queue",   sub: "Your prioritized accounts to work today" },
  triage:     { title: "Triage Board",    sub: "Confirm or override routing — the human-in-the-loop gate" },
  scoreboard: { title: "Scoreboard",      sub: "Attribution & rev-share — audit any time" },
  accounts:   { title: "Accounts",        sub: "Directory of every tracked account" },
  detail:     { title: "Account",         sub: "Full evidence trail" },
};

function App() {
  const [view, setView] = useStateApp("queue");
  const [acctId, setAcctId] = useStateApp(null);
  const [prev, setPrev] = useStateApp("queue");
  const [toast, setToast] = useStateApp(null);

  useEffectApp(() => { document.querySelector(".pe-scroll")?.scrollTo(0, 0); }, [view, acctId]);
  useEffectApp(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const open = (id) => { setPrev(view === "detail" ? prev : view); setAcctId(id); setView("detail"); };
  const nav = (v) => { setView(v); if (v !== "detail") setAcctId(null); };

  const action = (kind, a) => {
    const msg = {
      call: <span><b>{a.name}</b> opened in HubSpot — call logged when you dial</span>,
      touch: <span>Touch logged on <b>{a.name}</b></span>,
      nurture: <span><b>{a.name}</b> kicked back to nurture — marketing takes it from here</span>,
    }[kind];
    setToast({ msg });
  };

  const counts = { queue: P.QUEUE.length, triage: P.BATCH.filter((a) => !a.route.confirmed).length };

  let screen;
  if (view === "queue") screen = <P.MorningQueue onOpen={open} onAction={action} />;
  else if (view === "triage") screen = <P.TriageBoard onOpen={open} />;
  else if (view === "scoreboard") screen = <P.Scoreboard onOpen={open} />;
  else if (view === "accounts") screen = <P.Accounts onOpen={open} />;
  else if (view === "detail") screen = <P.AccountDetail id={acctId} onBack={() => nav(prev)} />;

  const meta = view === "detail" ? TITLES.detail : TITLES[view];
  const right = view === "triage"
    ? <P.Badge tone="coral" variant="soft" dot>{counts.triage} awaiting confirmation</P.Badge>
    : view === "queue"
    ? <P.Badge tone="green" variant="soft" dot>{P.QUEUE.filter(a=>a.stage==="engaged").length} live conversations</P.Badge>
    : null;

  return (
    <div className="pe-app">
      <P.Sidebar view={view} onNav={nav} counts={counts} />
      <div className="pe-main">
        <P.Topbar title={meta.title} sub={meta.sub} right={right} />
        <div className="pe-scroll">{screen}</div>
      </div>
      <div className={"pe-toast" + (toast ? " pe-toast--on" : "")}>
        {toast && <React.Fragment><P.Icons.CheckCheck size={17} />{toast.msg}</React.Fragment>}
      </div>
    </div>
  );
}

// Badge passthrough for app-level use
window.PE.Badge = window.SixthCityMarketingDesignSystem_4d5a9e.Badge;

ReactDOM.createRoot(document.getElementById("pe-root")).render(<App />);
