/* ============================================================
   Activity — did we actually do this?
   Company-grouped, newest activity first. The engine records
   two facts (we saved them, we sent the first touch) plus the
   operator's promotes and decisions; everything after the touch
   lives in HubSpot and the inbox by design. The Compose action
   here is how you reach a SECOND person at a company already
   touched — never on one the operator rejected.
   ============================================================ */
const { useState: useStateA, useEffect: useEffectA } = React;
const PEA = window.PE;
const IcoA = PEA.Icons;
const { Badge: BadgeA, Button: BtnA } = window.SixthCityMarketingDesignSystem_4d5a9e;

const AC_CSS = `
.ac-tiles{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:20px 0; }
@media (max-width:1100px){ .ac-tiles{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:800px){ .ac-tiles{ grid-template-columns:1fr; } }
.ac-tile{ background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-xs); padding:16px 18px; }
.ac-tile__v{ font-family:var(--font-condensed); font-weight:800; font-size:30px;
  color:var(--text-strong); line-height:1; }
.ac-tile__k{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle);
  text-transform:uppercase; letter-spacing:.06em; margin-top:6px; }
.ac-filters{ display:flex; align-items:center; gap:10px; margin-bottom:14px; font-size:12px; }
.ac-filters label{ display:flex; align-items:center; gap:6px; color:var(--text-body); cursor:pointer; }
.ac-row{ background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:15px 18px; margin-bottom:11px; }
.ac-row__h{ display:flex; align-items:center; gap:12px; }
.ac-row__nm{ font-weight:800; font-size:var(--text-md); color:var(--text-strong); }


.ac-row__sp{ margin-left:auto; display:flex; align-items:center; gap:9px; }
.ac-ev{ display:flex; align-items:center; gap:9px; font-size:12px; color:var(--text-body);
  padding:6px 0; border-top:1px solid var(--border-subtle); margin-top:8px; }
.ac-ev:first-of-type{ margin-top:10px; }
.ac-ev__t{ font-family:var(--font-mono); font-size:10px; color:var(--text-subtle);
  margin-left:auto; white-space:nowrap; }
.ac-hs{ font-size:12px; font-weight:700; color:var(--coral-600); text-decoration:none; }
.ac-rejected{ font-size:12px; color:var(--text-subtle); }
.ac-empty{ text-align:center; padding:54px 20px; color:var(--text-muted); }
.ac-empty h3{ font-family:var(--font-display); font-weight:900; color:var(--text-strong); margin:10px 0 4px; }
`;
(function(){ if(document.getElementById("ac-css"))return; const s=document.createElement("style"); s.id="ac-css"; s.textContent=AC_CSS; document.head.appendChild(s); })();

const EV_LABEL = { saved: "Saved to CRM", emailed: "First touch sent", decided: "Decision", promoted: "LFG" };
const EV_TONE = { saved: "neutral", emailed: "green", decided: "warning", promoted: "green" };

// Cleveland's clock, not the server's and not the viewer's.
function whenET(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function ActivityScreen({ onError, onUndo, onUndoError }) {
  const [data, setData] = useStateA(null);
  const [showSaved, setShowSaved] = useStateA(false);
  const [showDecided, setShowDecided] = useStateA(false);
  const [open, setOpen] = useStateA({});     // domain -> compose panel expanded

  const include = [];
  if (showSaved) include.push("saved");
  if (showDecided) include.push("decided");

  useEffectA(() => {
    let live = true;
    PEA.fetchActivity(include, 100)
      .then((j) => { if (live) setData(j); })
      .catch((e) => onError && onError(e));
    return () => { live = false; };
  }, [showSaved, showDecided]);

  async function returnToTriage(domain, name) {
    try {
      await PEA.undecideDomains([domain]);
      setData(await PEA.fetchActivity(include, 100));
      // The trail is derived, so a restored company also disappears from this
      // view (it was only visible via the decisions filter) — a silent vanish
      // reads identically to the reject-poof it just reversed. Say so.
      onUndo && onUndo(name || domain);
    } catch (e) {
      // Undo is the only reversal path in the product — the shared push-failure
      // toast ("Push failed —") would be actively misleading here.
      onUndoError ? onUndoError(name || domain, e) : (onError && onError(e));
    }
  }

  const t = (data && data.totals) || { saved: 0, emailed: 0, decided: 0, promoted: 0 };
  const companies = (data && data.companies) || [];

  // A send here can be the first touch for an "Include saves" row that hasn't been
  // worked yet — with no refresh, Queue/Triage keep listing it as unworked for the
  // rest of the session (nav doesn't re-pull). No removal animation: this screen is
  // a record, not a worklist, so the row just stays put.
  function onSent() { PEA.refresh(); }

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>The record · what we actually did</div>
          <h2 style={{ margin: "6px 0 0" }}>Activity</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "68ch" }}>
            Every company the engine saved and every first touch sent, newest first. What
            happens after the touch lives in HubSpot and your inbox — this is the record of
            what the engine and the team did here.
          </p>
        </div>
      </div>

      <div className="ac-tiles">
        <div className="ac-tile"><div className="ac-tile__v">{t.saved.toLocaleString("en-US")}</div><div className="ac-tile__k">companies saved</div></div>
        <div className="ac-tile"><div className="ac-tile__v">{t.promoted.toLocaleString("en-US")}</div><div className="ac-tile__k">promoted (LFG)</div></div>
        <div className="ac-tile"><div className="ac-tile__v">{t.emailed.toLocaleString("en-US")}</div><div className="ac-tile__k">first touches sent</div></div>
        <div className="ac-tile"><div className="ac-tile__v">{t.decided.toLocaleString("en-US")}</div><div className="ac-tile__k">decisions made</div></div>
      </div>

      <div className="ac-filters">
        <label><input type="checkbox" checked={showSaved} onChange={(e) => setShowSaved(e.target.checked)} /> Include saves</label>
        <label><input type="checkbox" checked={showDecided} onChange={(e) => setShowDecided(e.target.checked)} /> Include decisions</label>
      </div>

      {data === null ? (
        <div className="ac-empty">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="ac-empty">
          <IcoA.Layers size={34} style={{ color: "var(--coral-400)" }} />
          <h3>No touches yet</h3>
          <p>{t.saved.toLocaleString("en-US")} companies are saved and waiting. Send a first
            touch from the Morning Queue and it shows up here.</p>
        </div>
      ) : companies.map((c) => {
        // events are sorted newest-first, so [0] among "decided" is the newest call —
        // an earlier hold overridden by a later reject must still block Compose.
        const decided = c.events.find((e) => e.type === "decided");
        const rejected = decided && decided.detail === "reject";
        return (
          <div className="ac-row" key={c.domain}>
            <div className="ac-row__h">
              <div className="ac-row__nm">
                <PEA.CompanyLink name={c.name} domain={c.domain} />
              </div>
              <div className="ac-row__sp">
                {c.hubspot_url && <a className="ac-hs" href={c.hubspot_url} target="_blank" rel="noopener noreferrer">HubSpot →</a>}
                {decided && <BtnA variant="ghost" size="sm" onClick={() => returnToTriage(c.domain, c.name)}>Return to triage</BtnA>}
                {rejected
                  ? <span className="ac-rejected">Rejected — no outreach from here</span>
                  : <BtnA variant="secondary" size="sm"
                      onClick={() => setOpen((o) => ({ ...o, [c.domain]: !o[c.domain] }))}>
                      {open[c.domain] ? "Close" : "Compose"}
                    </BtnA>}
              </div>
            </div>
            {c.events.map((e, i) => (
              <div className="ac-ev" key={i}>
                <BadgeA tone={EV_TONE[e.type] || "neutral"} variant="soft" size="sm">{EV_LABEL[e.type] || e.type}</BadgeA>
                <span>{e.detail}{e.by ? " · " + e.by : ""}</span>
                <span className="ac-ev__t">{whenET(e.at)}</span>
              </div>
            ))}
            {!rejected && open[c.domain] && <PEA.ComposePanel account={{ domain: c.domain, name: c.name }} onError={onError} onSent={onSent} />}
          </div>
        );
      })}
    </div>
  );
}

window.PE.ActivityScreen = ActivityScreen;
