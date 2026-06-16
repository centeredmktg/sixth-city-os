/* ============================================================
   Ingestion Engine — CSV importer (LIVE).
   Drop a Clay export (or any account list with a domain column),
   preview it, and POST it to /api/ingest. The engine normalizes
   headers, maps industry -> vertical, scores, routes, dedupes
   net-new vs HubSpot, and stores the ranked queue.
   ============================================================ */
const { useState: useStateImp, useEffect: useEffectImp, useRef: useRefImp } = React;
const PIM = window.PE;
const IcoM = PIM.Icons;
const { Badge: BadgeM, Button: BtnM, Switch: SwitchM } = window.SixthCityMarketingDesignSystem_4d5a9e;

const IMP_CSS = `
.im-back{ margin-left:auto; flex:none; }
.im-drop{ margin:24px 0 18px; border:2px dashed var(--border-default); border-radius:var(--radius-lg);
  background:var(--surface-card); padding:46px 28px; display:flex; flex-direction:column; align-items:center; gap:12px;
  text-align:center; transition:border-color var(--tap-transition), background var(--tap-transition); cursor:pointer; }
.im-drop.drag, .im-drop:hover{ border-color:var(--coral-400); background:var(--coral-50); }
.im-drop__ic{ width:58px; height:58px; border-radius:var(--radius-lg); display:grid; place-items:center; background:var(--coral-50); color:var(--coral-600); }
.im-drop:hover .im-drop__ic{ background:#fff; }
.im-drop__t{ font-family:var(--font-display); font-weight:900; font-size:var(--text-xl); color:var(--text-strong); }
.im-drop__sub{ font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-subtle); }
.im-bar{ display:flex; align-items:center; gap:13px; padding:13px 18px; margin:22px 0 18px; background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-md); box-shadow:var(--shadow-xs); }
.im-bar__ic{ width:34px; height:34px; border-radius:var(--radius-sm); display:grid; place-items:center; background:var(--green-50); color:var(--green-600); flex:none; }
.im-bar__nm{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); font-family:var(--font-mono); }
.im-bar__meta{ font-size:11px; color:var(--text-subtle); margin-top:1px; }
.im-bar__x{ margin-left:auto; }
.im-grid{ display:grid; grid-template-columns:1fr 332px; gap:22px; align-items:start; }
.im-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.im-card__h{ padding:15px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:10px; }
.im-card__h h4{ margin:0; font-size:var(--text-lg); }
.im-card__h .pe-overline{ margin-left:auto; }
.im-card__b{ padding:8px 20px 16px; }
.im-prev{ overflow:auto; }
.im-prevtbl{ width:100%; border-collapse:collapse; font-size:11px; }
.im-prevtbl th{ text-align:left; font-family:var(--font-mono); font-size:10px; color:var(--text-subtle); padding:6px 10px; border-bottom:1px solid var(--border-default); white-space:nowrap; }
.im-prevtbl td{ padding:7px 10px; border-bottom:1px solid var(--border-subtle); white-space:nowrap; color:var(--text-body); max-width:200px; overflow:hidden; text-overflow:ellipsis; }
.im-prevtbl tr:last-child td{ border-bottom:none; }
.im-opts{ position:sticky; top:0; background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); overflow:hidden; }
.im-opts__h{ padding:15px 18px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.im-opts__h h4{ margin:0; font-size:var(--text-md); }
.im-opt{ padding:14px 18px; border-bottom:1px solid var(--border-subtle); }
.im-opt__top{ display:flex; align-items:flex-start; gap:10px; justify-content:space-between; }
.im-opt__t{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); }
.im-opt__d{ font-size:11px; color:var(--text-muted); margin-top:3px; line-height:1.4; max-width:34ch; }
.im-sum{ padding:16px 18px; background:var(--surface-cream); }
.im-sum__row{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px; }
.im-sum__row:last-of-type{ margin-bottom:0; }
.im-sum__k{ font-size:var(--text-sm); color:var(--text-muted); }
.im-sum__v{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-lg); color:var(--text-strong); }
.im-sum__v.c{ color:var(--coral-600); }
.im-run{ padding:16px 18px; }
.im-warn{ margin:0 18px 14px; padding:10px 12px; border-radius:var(--radius-sm); background:var(--danger-bg); color:var(--danger); font-size:11px; font-weight:700; }
.im-running{ max-width:640px; margin:40px auto; background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-md); padding:30px 32px; }
.im-running__h{ display:flex; align-items:center; gap:12px; margin-bottom:6px; }
.im-running__h h3{ margin:0; font-family:var(--font-display); font-weight:900; font-size:var(--text-2xl); color:var(--text-strong); }
.im-running__sub{ font-size:var(--text-sm); color:var(--text-muted); margin:0 0 22px; }
.im-prog{ height:8px; border-radius:99px; background:var(--stone-200); overflow:hidden; margin-bottom:22px; }
.im-prog__fill{ height:100%; border-radius:99px; background:var(--gradient-ember); transition:width .5s ease; }
.im-task{ display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-subtle); }
.im-task:last-child{ border-bottom:none; }
.im-task__ic{ width:26px; height:26px; border-radius:50%; display:grid; place-items:center; flex:none; }
.im-task__ic--done{ background:var(--green-500); color:#fff; }
.im-task__ic--now{ background:var(--coral-500); color:#fff; }
.im-task__ic--wait{ background:var(--stone-150); color:var(--stone-400); }
.im-task__t{ font-weight:700; font-size:var(--text-sm); color:var(--text-body); }
.im-task--wait .im-task__t{ color:var(--text-subtle); }
@keyframes im-spin{ to{ transform:rotate(360deg); } }
.im-spin{ animation:im-spin 1s linear infinite; }
`;
(function(){ if(document.getElementById("im-css"))return; const s=document.createElement("style"); s.id="im-css"; s.textContent=IMP_CSS; document.head.appendChild(s); })();

const fmtI = (n) => (n == null ? "—" : n.toLocaleString("en-US"));

/* light client-side CSV parse for preview (not the ingest — the engine re-parses) */
function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [], count: 0, hasDomain: false };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1, 6).map((l) => l.split(","));
  const hasDomain = headers.some((h) => ["domain", "company domain", "website", "domain name"].includes(h.toLowerCase()));
  return { headers, rows, count: lines.length - 1, hasDomain };
}

const RUN_TASKS = [
  "Reading CSV & validating headers",
  "Normalizing domains & mapping industry → vertical",
  "Scoring (fit + timing) & routing",
  "Deduping net-new vs the HubSpot book",
  "Storing the ranked triage queue",
];

function FileImporter({ onCancel, onComplete, onError }) {
  const [step, setStep] = useStateImp("pick");   // pick | configure | running
  const [file, setFile] = useStateImp(null);
  const [parsed, setParsed] = useStateImp(null);
  const [opts, setOpts] = useStateImp({ fallback: true, dedupe: true, signals: true, gate: false });
  const [taskIdx, setTaskIdx] = useStateImp(0);
  const [drag, setDrag] = useStateImp(false);
  const inputRef = useRefImp(null);

  const onPick = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => { setParsed(parseCsv(String(reader.result))); setStep("configure"); };
    reader.readAsText(f);
  };

  // running: animate the task list while the real POST is in flight; finish on resolve
  useEffectImp(() => {
    if (step !== "running") return;
    let alive = true;
    const iv = setInterval(() => { if (alive) setTaskIdx((i) => Math.min(i + 1, RUN_TASKS.length - 1)); }, 600);
    PIM.ingestFile(file)
      .then((res) => { if (!alive) return; clearInterval(iv); setTaskIdx(RUN_TASKS.length); setTimeout(() => onComplete(res), 500); })
      .catch((err) => { if (!alive) return; clearInterval(iv); setStep("configure"); onError && onError(err); });
    return () => { alive = false; clearInterval(iv); };
  }, [step]);

  const rows = parsed ? parsed.count : null;
  const cols = parsed ? parsed.headers.length : 0;
  const previewCols = parsed ? parsed.headers.slice(0, 6) : [];

  return (
    <div className="pe-page">
      <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files && e.target.files[0])} />

      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>New ingest run · run any list through the machine</div>
          <h2 style={{ margin: "6px 0 0" }}>Import a Clay export</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "68ch" }}>
            Clay does discovery and free enrichment; drop its export here and the engine takes over — normalizes the
            columns, maps industry to vertical, scores and ranks, and dedupes net-new against your HubSpot book.
          </p>
        </div>
        {step !== "running" && (
          <div className="im-back"><BtnM variant="ghost" size="sm" neutral icon={<IcoM.ChevronRight size={15} style={{ transform: "rotate(180deg)" }} />} onClick={onCancel}>Last run</BtnM></div>
        )}
      </div>

      {step === "pick" && (
        <div className={"im-drop" + (drag ? " drag" : "")}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files && e.dataTransfer.files[0]); }}>
          <div className="im-drop__ic"><IcoM.DownloadCloud size={28} /></div>
          <div className="im-drop__t">Drop a Clay export, or any account list</div>
          <div className="im-drop__sub">.csv — a domain column is required (it's the net-new key)</div>
          <div style={{ marginTop: 6 }}><BtnM variant="secondary" size="sm" icon={<IcoM.Plug size={14} />}>Browse files</BtnM></div>
        </div>
      )}

      {step === "configure" && parsed && (
        <React.Fragment>
          <div className="im-bar">
            <div className="im-bar__ic">{parsed.hasDomain ? <IcoM.CircleCheck size={18} /> : <IcoM.Triangle size={18} />}</div>
            <div style={{ minWidth: 0 }}>
              <div className="im-bar__nm">{file.name}</div>
              <div className="im-bar__meta">{fmtI(rows)} rows · {cols} columns detected · {parsed.hasDomain ? "domain column present" : "no domain column found"}</div>
            </div>
            <div className="im-bar__x"><BtnM variant="ghost" size="sm" neutral icon={<IcoM.X size={14} />} onClick={() => setStep("pick")}>Change</BtnM></div>
          </div>

          <div className="im-grid">
            <div className="im-card">
              <div className="im-card__h"><IcoM.Database size={17} style={{ color: "var(--coral-500)" }} /><h4>Preview</h4><span className="pe-overline">first 5 of {fmtI(rows)} rows</span></div>
              <div className="im-card__b im-prev">
                <table className="im-prevtbl">
                  <thead><tr>{previewCols.map((h, i) => <th key={i}>{h || "—"}</th>)}</tr></thead>
                  <tbody>
                    {parsed.rows.map((r, i) => (
                      <tr key={i}>{previewCols.map((_, j) => <td key={j}>{r[j] != null ? r[j].trim() : ""}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="im-opts">
              <div className="im-opts__h"><IcoM.Sliders size={16} style={{ color: "var(--coral-500)" }} /><h4>Run options</h4></div>
              <div className="im-opt"><div className="im-opt__top"><div><div className="im-opt__t">PageSpeed fallback</div><div className="im-opt__d">Score domains without a Clay PageSpeed value (batched pass — on deck).</div></div><SwitchM checked={opts.fallback} onChange={(e) => setOpts({ ...opts, fallback: e.target.checked })} /></div></div>
              <div className="im-opt"><div className="im-opt__top"><div><div className="im-opt__t">Dedupe vs HubSpot</div><div className="im-opt__d">Drop firms already in the 5,234-company book. Domain is the key.</div></div><SwitchM checked={opts.dedupe} onChange={(e) => setOpts({ ...opts, dedupe: e.target.checked })} /></div></div>
              <div className="im-opt"><div className="im-opt__top"><div><div className="im-opt__t">Keep all & rank on fit</div><div className="im-opt__d">No signal gate — everything ingested is kept and ranked; low scorers sink.</div></div><SwitchM checked={!opts.gate} onChange={(e) => setOpts({ ...opts, gate: !e.target.checked })} /></div></div>

              <div className="im-sum">
                <div className="im-sum__row"><span className="im-sum__k">Rows in file</span><span className="im-sum__v">{fmtI(rows)}</span></div>
                <div className="im-sum__row"><span className="im-sum__k">Domain column</span><span className="im-sum__v c">{parsed.hasDomain ? "found" : "missing"}</span></div>
              </div>
              {!parsed.hasDomain && <div className="im-warn">No domain column detected — the engine will reject this. Add a "Domain" column and re-import.</div>}
              <div className="im-run">
                <BtnM variant="primary" size="md" block icon={<IcoM.Zap size={15} />} disabled={!parsed.hasDomain} onClick={() => { setTaskIdx(0); setStep("running"); }}>Run {fmtI(rows)} rows through the engine</BtnM>
              </div>
            </div>
          </div>
        </React.Fragment>
      )}

      {step === "running" && (
        <div className="im-running">
          <div className="im-running__h">
            <IcoM.Cpu size={24} style={{ color: "var(--coral-500)" }} />
            <h3>Ingesting {file ? file.name : "your list"}</h3>
          </div>
          <p className="im-running__sub">The engine is working the batch — this includes a batched HubSpot dedupe, so a big list takes a few seconds.</p>
          <div className="im-prog"><div className="im-prog__fill" style={{ width: Math.min(100, ((taskIdx + 1) / RUN_TASKS.length) * 100) + "%" }} /></div>
          {RUN_TASKS.map((t, i) => {
            const state = i < taskIdx ? "done" : i === taskIdx ? "now" : "wait";
            return (
              <div className={"im-task" + (state === "wait" ? " im-task--wait" : "")} key={i}>
                <div className={"im-task__ic im-task__ic--" + state}>
                  {state === "done" ? <IcoM.Check size={15} /> : state === "now" ? <IcoM.Refresh size={14} className="im-spin" /> : <IcoM.Dot size={14} />}
                </div>
                <span className="im-task__t">{t}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.PE.FileImporter = FileImporter;
