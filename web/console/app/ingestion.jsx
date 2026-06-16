/* ============================================================
   Ingestion Engine — the front-of-pipeline ops surface.
   Watch a run flow in: Clay export → site-quality enrich →
   signals attached → dedupe vs HubSpot → net-new ready to score.
   ============================================================ */
const { useState: useStateI, useMemo: useMemoI } = React;
const PEI = window.PE;
const Ico = PEI.Icons;
const { Badge: BadgeI, Button: BtnI } = window.SixthCityMarketingDesignSystem_4d5a9e;

const ING_CSS = `
.ig-hero{ display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:16px; margin:22px 0; }
.ig-stat{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:18px 20px; box-shadow:var(--shadow-sm); }
.ig-stat--feature{ background:var(--ink-700); border-color:transparent; color:#fff; position:relative; overflow:hidden; }
.ig-stat--feature::after{ content:""; position:absolute; inset:0; background:radial-gradient(80% 90% at 100% 0%, rgba(237,106,60,.24), transparent 60%); pointer-events:none; }
.ig-stat__l{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:700; color:var(--text-subtle); margin-bottom:8px; display:flex; align-items:center; gap:7px; }
.ig-stat--feature .ig-stat__l{ color:var(--orange-400); }
.ig-stat__v{ font-family:var(--font-condensed); font-weight:800; font-size:46px; line-height:.95; color:var(--text-strong); letter-spacing:-.01em; }
.ig-stat--feature .ig-stat__v{ color:#fff; }
.ig-stat__note{ font-size:var(--text-sm); color:var(--text-muted); margin-top:8px; line-height:1.4; }
.ig-stat--feature .ig-stat__note{ color:rgba(255,255,255,.74); }
.ig-flow{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:20px 22px; margin-bottom:22px; }
.ig-flow__h{ display:flex; align-items:center; gap:10px; margin-bottom:18px; }
.ig-flow__h h4{ margin:0; font-size:var(--text-lg); }
.ig-flow__h .pe-overline{ margin-left:auto; }
.ig-steps{ display:flex; align-items:stretch; gap:0; }
.ig-step{ flex:1; display:flex; flex-direction:column; gap:8px; padding:0 4px; min-width:0; }
.ig-step__ic{ width:40px; height:40px; border-radius:var(--radius-md); display:grid; place-items:center; background:var(--coral-50); color:var(--coral-600); }
.ig-step--last .ig-step__ic{ background:var(--ink-700); color:#fff; }
.ig-step__v{ font-family:var(--font-condensed); font-weight:800; font-size:32px; line-height:.9; color:var(--text-strong); }
.ig-step__lab{ font-weight:800; font-size:var(--text-sm); color:var(--text-body); }
.ig-step__sub{ font-size:var(--text-xs); color:var(--text-subtle); line-height:1.35; }
.ig-step__meta{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle); margin-top:2px; }
.ig-arrow{ display:flex; align-items:center; color:var(--stone-300); padding-top:8px; }
.ig-grid{ display:grid; grid-template-columns:1fr 360px; gap:22px; align-items:start; }
.ig-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.ig-card__h{ padding:15px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:10px; }
.ig-card__h h4{ margin:0; font-size:var(--text-lg); }
.ig-filters{ margin-left:auto; display:flex; gap:6px; }
.ig-chip{ border:1px solid var(--border-default); background:var(--surface-card); color:var(--text-muted); font-family:var(--font-sans); font-weight:700; font-size:11px; padding:5px 11px; border-radius:var(--radius-pill); cursor:pointer; transition:all var(--tap-transition); }
.ig-chip:hover{ background:var(--surface-sunken); }
.ig-chip.on{ background:var(--ink-700); color:#fff; border-color:var(--ink-700); }
.ig-chip__n{ font-family:var(--font-mono); opacity:.7; margin-left:4px; }
.ig-tbl{ width:100%; border-collapse:collapse; }
.ig-tbl thead th{ text-align:left; font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em; font-size:10px; font-weight:700; color:var(--text-subtle); padding:10px 16px; border-bottom:1px solid var(--border-default); white-space:nowrap; }
.ig-tbl thead th.r{ text-align:right; }
.ig-tbl tbody td{ padding:12px 16px; border-bottom:1px solid var(--border-subtle); vertical-align:middle; }
.ig-tbl tbody tr:last-child td{ border-bottom:none; }
.ig-tbl tbody tr{ transition:background var(--tap-transition); }
.ig-tbl tbody tr:hover{ background:var(--stone-50); }
.ig-tbl tbody tr.merged{ background:var(--stone-50); }
.ig-acct__name{ font-weight:800; color:var(--text-strong); font-size:var(--text-sm); display:flex; align-items:center; gap:7px; }
.ig-acct__meta{ font-size:11px; color:var(--text-subtle); margin-top:1px; }
.ig-acct__dom{ font-family:var(--font-mono); }
.ig-src{ display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--text-body); }
.ig-src svg{ color:var(--coral-500); }
.ig-src--fb svg{ color:var(--orange-500); }
.ig-src--fb{ color:var(--text-muted); }
.ig-site{ display:flex; align-items:center; gap:9px; min-width:120px; }
.ig-site__bar{ flex:1; height:7px; border-radius:99px; background:var(--stone-200); overflow:hidden; }
.ig-site__fill{ height:100%; border-radius:99px; }
.ig-site__v{ font-family:var(--font-mono); font-size:12px; font-weight:600; color:var(--text-body); width:24px; text-align:right; }
.ig-sigs{ display:flex; flex-wrap:wrap; gap:4px; }
.ig-sig{ font-size:10px; font-weight:700; padding:2px 7px; border-radius:var(--radius-sm); background:var(--surface-cream); border:1px solid var(--stone-200); color:var(--text-muted); white-space:nowrap; }
.ig-sig--hot{ background:var(--heat-hot-bg); border-color:transparent; color:var(--coral-700); }
.ig-sigmore{ font-size:10px; font-weight:700; color:var(--text-subtle); align-self:center; }
.ig-panel{ position:sticky; top:0; display:flex; flex-direction:column; gap:16px; }
.ig-srcblk{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); overflow:hidden; }
.ig-srcblk__h{ padding:14px 18px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.ig-srcblk__h h4{ margin:0; font-size:var(--text-md); }
.ig-srcblk__h .pe-overline{ margin-left:auto; font-size:10px; }
.ig-source{ padding:14px 18px; border-bottom:1px solid var(--border-subtle); }
.ig-source:last-child{ border-bottom:none; }
.ig-source__top{ display:flex; align-items:center; gap:9px; }
.ig-source__ic{ width:30px; height:30px; border-radius:var(--radius-sm); display:grid; place-items:center; background:var(--surface-sunken); color:var(--ink-600); flex:none; }
.ig-source__nm{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); line-height:1.1; }
.ig-source__role{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em; font-size:10px; font-weight:700; color:var(--coral-600); }
.ig-source__st{ margin-left:auto; }
.ig-source__prov{ font-size:11px; color:var(--text-muted); margin:8px 0 0; line-height:1.4; }
.ig-source__stats{ display:flex; gap:14px; margin-top:9px; padding-top:9px; border-top:1px dashed var(--border-subtle); }
.ig-source__stat{ display:flex; flex-direction:column; }
.ig-source__sv{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-lg); color:var(--text-strong); line-height:1; }
.ig-source__sl{ font-size:10px; color:var(--text-subtle); text-transform:uppercase; letter-spacing:.06em; font-weight:700; margin-top:2px; }
.ig-source--ondeck{ padding:12px 18px; }
.ig-source--ondeck .ig-source__prov{ margin-top:6px; }
.ig-handoff{ position:sticky; bottom:0; margin:24px -28px -120px; padding:18px 28px; background:var(--surface-card); border-top:1px solid var(--border-default); box-shadow:0 -8px 24px -16px rgba(36,39,45,.28); display:flex; align-items:center; gap:18px; z-index:5; }
.ig-handoff__t{ font-size:var(--text-sm); color:var(--text-muted); }
.ig-handoff__t b{ color:var(--text-strong); font-weight:800; }
.ig-handoff__acts{ margin-left:auto; display:flex; gap:10px; align-items:center; }
`;
(function(){ if(document.getElementById("ig-css"))return; const s=document.createElement("style"); s.id="ig-css"; s.textContent=ING_CSS; document.head.appendChild(s); })();

const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-US"));

function Stepper() {
  return (
    <div className="ig-steps">
      {PEI.STAGES.map((st, i) => {
        const StIcon = Ico[st.icon];
        const last = i === PEI.STAGES.length - 1;
        return (
          <React.Fragment key={st.key}>
            <div className={"ig-step" + (last ? " ig-step--last" : "")}>
              <div className="ig-step__ic"><StIcon size={20} /></div>
              <div className="ig-step__v">{fmt(st.value)}</div>
              <div className="ig-step__lab">{st.label}</div>
              <div className="ig-step__sub">{st.sub}</div>
              <div className="ig-step__meta">{st.meta}</div>
            </div>
            {!last && <div className="ig-arrow"><Ico.ChevronRight size={22} /></div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StreamRow({ a }) {
  const hasSite = a.site != null;
  const heat = hasSite ? PEI.siteHeat(a.site) : { color: "var(--stone-300)" };
  const SrcIcon = Ico[PEI.srcIcon[a.src]] || Ico.Sparkles;
  const kinds = a.signalKinds || [];
  const shown = kinds.slice(0, 3);
  return (
    <tr className={a.dedupe === "merged" ? "merged" : ""}>
      <td>
        <div className="ig-acct__name">{a.name}</div>
        <div className="ig-acct__meta"><span className="ig-acct__dom">{a.domain}</span> · {PEI.Vertical[a.vertical] || a.vertical} · {a.city}{a.state ? ", " + a.state : ""}</div>
      </td>
      <td>
        <span className={"ig-src" + (a.src === "pagespeed" ? " ig-src--fb" : "")}>
          <SrcIcon size={13} />{PEI.srcLabel[a.src] || a.src}
        </span>
      </td>
      <td>
        <div className="ig-site">
          <div className="ig-site__bar"><div className="ig-site__fill" style={{ width: (hasSite ? a.site : 0) + "%", background: heat.color }} /></div>
          <span className="ig-site__v">{hasSite ? a.site : "—"}</span>
        </div>
      </td>
      <td>
        <div className="ig-sigs">
          {shown.map((k) => (
            <span key={k} className={"ig-sig" + (k === "ai_citation_gap" ? " ig-sig--hot" : "")}>{PEI.SignalKind[k] || k}</span>
          ))}
          {kinds.length > 3 && <span className="ig-sigmore">+{kinds.length - 3}</span>}
          {kinds.length === 0 && <span className="ig-sigmore">no signals yet</span>}
        </div>
      </td>
      <td className="r">
        {a.dedupe === "net_new"
          ? <BadgeI tone="green" variant="soft" dot icon={<Ico.CircleCheck size={12} />}>Net-new</BadgeI>
          : <BadgeI tone="neutral" variant="soft" icon={<Ico.GitMerge size={12} />}>In HubSpot · merged</BadgeI>}
      </td>
    </tr>
  );
}

function SourceCard({ s }) {
  const SIcon = Ico[s.icon];
  const st = PEI.STATUS[s.status];
  return (
    <div className="ig-source">
      <div className="ig-source__top">
        <div className="ig-source__ic"><SIcon size={16} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="ig-source__nm">{s.name}</div>
          <div className="ig-source__role">{PEI.ROLE[s.role]}</div>
        </div>
        <span className="ig-source__st"><BadgeI tone={st.tone} variant="soft" size="sm" dot>{st.label}</BadgeI></span>
      </div>
      <p className="ig-source__prov">{s.note}</p>
      <div className="ig-source__stats">
        <div className="ig-source__stat">
          <span className="ig-source__sv">{s.accounts ? fmt(s.accounts) : "—"}</span>
          <span className="ig-source__sl">Accounts</span>
        </div>
        <div className="ig-source__stat">
          <span className="ig-source__sv">{s.signals ? fmt(s.signals) : "—"}</span>
          <span className="ig-source__sl">Signals</span>
        </div>
        <div className="ig-source__stat">
          <span className="ig-source__sv" style={{ fontSize: "var(--text-sm)", paddingTop: 3 }}>{s.lastSync}</span>
          <span className="ig-source__sl">Last sync</span>
        </div>
      </div>
    </div>
  );
}

function OnDeckCard({ s }) {
  const SIcon = Ico[s.icon];
  const st = PEI.STATUS[s.status];
  return (
    <div className="ig-source ig-source--ondeck">
      <div className="ig-source__top">
        <div className="ig-source__ic"><SIcon size={15} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="ig-source__nm">{s.name}</div>
          <div className="ig-source__role" style={{ color: "var(--text-subtle)" }}>{PEI.ROLE[s.role]}</div>
        </div>
        <span className="ig-source__st"><BadgeI tone={st.tone} variant="outline" size="sm">{st.label}</BadgeI></span>
      </div>
      <p className="ig-source__prov">{s.note}</p>
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "net_new", label: "Net-new" },
  { key: "merged", label: "Merged" },
  { key: "pagespeed", label: "Fallback-scored" },
];

function IngestionEngine({ onSendToScoring, onRunIngest }) {
  const [filter, setFilter] = useStateI("all");
  const [enriching, setEnriching] = useStateI(false);
  const [enrichRemaining, setEnrichRemaining] = useStateI(null);
  const R = PEI.RUN;

  async function runEnrichment() {
    setEnriching(true);
    let remaining = 1;
    while (remaining > 0) {
      const res = await PEI.enrichChunk(20);
      remaining = res.remaining;
      setEnrichRemaining(remaining);
      await PEI.refresh();   // pull re-scored stream so the queue re-ranks live
    }
    setEnriching(false);
  }

  const rows = useMemoI(() => PEI.STREAM.filter((a) => {
    if (filter === "all") return true;
    if (filter === "net_new") return a.dedupe === "net_new";
    if (filter === "merged") return a.dedupe === "merged";
    if (filter === "pagespeed") return a.src === "pagespeed";
    return true;
  }), [filter, PEI.STREAM]);

  const counts = {
    all: PEI.STREAM.length,
    net_new: PEI.STREAM.filter((a) => a.dedupe === "net_new").length,
    merged: PEI.STREAM.filter((a) => a.dedupe === "merged").length,
    pagespeed: PEI.STREAM.filter((a) => a.src === "pagespeed").length,
  };

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>Pipeline front-end · {R.ranAt}</div>
          <h2 style={{ margin: "6px 0 0" }}>{fmt(R.ingested)} firms ingested — {fmt(R.netNew)} net-new, ready to score</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "70ch" }}>
            Clay finds and enriches the universe for free. The engine pulls that payload in, attaches buying signals,
            dedupes against your HubSpot, and hands a clean batch to scoring. Any list runs through the same pipe.
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <BadgeI tone="green" variant="soft" dot>{R.netNew ? "Live" : "No run yet"}</BadgeI>
          <BtnI variant="secondary" size="sm" icon={<Ico.Refresh size={14} />} onClick={onRunIngest}>Run ingest</BtnI>
          <BtnI variant="primary" size="sm" icon={<Ico.Gauge size={14} />} onClick={runEnrichment} disabled={enriching}>
            {enriching ? ("Enriching… " + (enrichRemaining ?? "")) : "Run PageSpeed + audit"}
          </BtnI>
        </div>
      </div>

      <div className="ig-hero">
        <div className="ig-stat ig-stat--feature">
          <div className="ig-stat__l"><Ico.Cpu size={13} /> Net-new ready to score</div>
          <div className="ig-stat__v">{fmt(R.netNew)}</div>
          <div className="ig-stat__note">Deduped against HubSpot — these aren't in your book yet. The clean batch the scoring job picks up next.</div>
        </div>
        <div className="ig-stat">
          <div className="ig-stat__l"><Ico.DownloadCloud size={13} /> Ingested this run</div>
          <div className="ig-stat__v">{fmt(R.ingested)}</div>
          <div className="ig-stat__note">Pulled from the list you ran through the machine.</div>
        </div>
        <div className="ig-stat">
          <div className="ig-stat__l"><Ico.Layers size={13} /> Signals attached</div>
          <div className="ig-stat__v">{fmt(R.signals)}</div>
          <div className="ig-stat__note">Site quality, SEO gaps, and the public-signal moat — the "why now."</div>
        </div>
        <div className="ig-stat">
          <div className="ig-stat__l"><Ico.GitMerge size={13} /> Already in book</div>
          <div className="ig-stat__v">{fmt(R.merged)}</div>
          <div className="ig-stat__note">Already in HubSpot — deduped on domain, never re-created.</div>
        </div>
      </div>

      <div className="ig-flow">
        <div className="ig-flow__h">
          <Ico.Workflow size={18} style={{ color: "var(--coral-500)" }} />
          <h4>How this run moved</h4>
          <span className="pe-overline">find_accounts · ingest job</span>
        </div>
        <Stepper />
      </div>

      <div className="ig-grid">
        <div className="ig-card">
          <div className="ig-card__h">
            <Ico.Database size={17} style={{ color: "var(--coral-500)" }} />
            <h4>Ingest stream</h4>
            <div className="ig-filters">
              {FILTERS.map((f) => (
                <button key={f.key} className={"ig-chip" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>
                  {f.label}<span className="ig-chip__n">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>
          <table className="ig-tbl">
            <thead>
              <tr>
                <th>Account</th>
                <th>Source</th>
                <th>Site quality</th>
                <th>Signals</th>
                <th className="r">Dedupe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => <StreamRow key={a.id} a={a} />)}
            </tbody>
          </table>
        </div>

        <div className="ig-panel">
          <div className="ig-srcblk">
            <div className="ig-srcblk__h">
              <Ico.Plug size={16} style={{ color: "var(--coral-500)" }} />
              <h4>Sources this run</h4>
              <span className="pe-overline">registry</span>
            </div>
            {PEI.ACTIVE_SOURCES.map((s) => <SourceCard key={s.id} s={s} />)}
          </div>

          <div className="ig-srcblk">
            <div className="ig-srcblk__h">
              <Ico.Sliders size={16} style={{ color: "var(--text-subtle)" }} />
              <h4>On deck</h4>
              <span className="pe-overline">to-find scorecard</span>
            </div>
            {PEI.ONDECK_SOURCES.map((s) => <OnDeckCard key={s.id} s={s} />)}
          </div>
        </div>
      </div>

      <div className="ig-handoff">
        <Ico.ShieldCheck size={20} style={{ color: "var(--green-600)" }} />
        <div className="ig-handoff__t">
          <b>{fmt(PEI.RUN.netNew)} net-new accounts</b> enriched, deduped, and signal-attached.
          Ranked best-first below — work the top of the list.
        </div>
        <div className="ig-handoff__acts">
          <BtnI variant="primary" size="md" icon={<Ico.Refresh size={15} />} onClick={onRunIngest}>Import a list</BtnI>
        </div>
      </div>
    </div>
  );
}

window.PE.IngestionEngine = IngestionEngine;
