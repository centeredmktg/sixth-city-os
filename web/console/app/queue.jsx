/* ============================================================
   Morning Queue — "if you do nothing else today, work these."
   The focused daily shortlist: net-new, closer-bound, in-market-
   NOW prospects ranked best-first, each with its "why now" and a
   one-click confirm -> push. (Triage = full board; Accounts =
   whole book; this = today's top to act on.) LIVE: PE.STREAM.
   ============================================================ */
const { useState: useStateQ, useRef: useRefQ, useEffect: useEffectQ } = React;
const PEQ = window.PE;
const IcoQ = PEQ.Icons;
const { Badge: BadgeQ, Button: BtnQ } = window.SixthCityMarketingDesignSystem_4d5a9e;

const GATE_Q = 55;     // timing >= GATE => in-market now
const TOP_N = 12;      // a worklist, not the whole book

// "Why now" — pick the most sales-relevant signal to lead with.
const WHY_PRIORITY = ["ads_active", "new_location", "hiring_marketing", "ai_citation_gap",
  "site_quality", "seo_gap", "local_seo_gap", "review_velocity", "keyword_gap", "content_gap", "backlink_gap"];
const SIG_ICON_Q = { ads_active: "Activity", new_location: "MapPin", hiring_marketing: "Briefcase",
  ai_citation_gap: "Sparkles", site_quality: "Gauge", seo_gap: "Search", local_seo_gap: "MapPin",
  review_velocity: "Star", keyword_gap: "Search", content_gap: "Layers", backlink_gap: "Globe" };

const MQ_CSS = `
.mq-bar{ display:flex; align-items:center; gap:13px; padding:13px 18px; margin:18px 0; background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-md); box-shadow:var(--shadow-xs); }
.mq-bar__t{ font-size:var(--text-sm); color:var(--text-body); } .mq-bar__t b{ color:var(--text-strong); }
.mq-bar__sp{ margin-left:auto; }
.mq-card{ display:grid; grid-template-columns:auto 1fr auto; gap:16px; align-items:center;
  background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-sm); padding:15px 18px; margin-bottom:11px; transition:opacity var(--tap-transition);
  max-height:400px; }
.mq-card--done{ opacity:.55; background:var(--surface-cream); }
/* The compose panel renders as a sibling AFTER .mq-card, not inside it (so Compose can
   toggle without remounting the card). On send both must collapse as one unit or the
   panel detaches and slides on its own — the leaving flag lives on their shared wrapper
   (.mq-row) and drives both children via the descendant rules below. */
.mq-row--leaving{ pointer-events:none; opacity:0; transform:translateY(-6px);
  transition:opacity .28s ease, transform .28s ease; }
.mq-row--leaving .mq-card, .mq-row--leaving .mq-cp{ max-height:0; overflow:hidden;
  margin-top:0; margin-bottom:0; padding-top:0; padding-bottom:0;
  transition:max-height .4s ease, margin .4s ease, padding .4s ease; }
/* .mq-cp (compose.jsx) has no numeric max-height at rest — "none" can't be
   transitioned, so give it one here, scoped to Queue rows only, high enough that
   a real (open, multi-contact) panel never gets clipped by it. */
.mq-row .mq-cp{ max-height:2000px; }
@media (prefers-reduced-motion: reduce){
  .mq-row--leaving{ transition:none; }
  .mq-row--leaving .mq-card, .mq-row--leaving .mq-cp{ transition:none; }
}
.mq-rank{ width:30px; height:30px; border-radius:50%; background:var(--ink-700); color:#fff; display:grid; place-items:center;
  font-family:var(--font-condensed); font-weight:800; font-size:14px; flex:none; }
.mq-nm{ font-weight:800; font-size:var(--text-md); color:var(--text-strong); }
.mq-meta{ font-size:11px; color:var(--text-muted); margin-top:2px; }
.mq-why{ display:flex; align-items:center; gap:7px; margin-top:7px; font-size:12px; color:var(--text-body); }
.mq-why__ic{ width:22px; height:22px; border-radius:var(--radius-sm); background:var(--coral-50); color:var(--coral-600); display:grid; place-items:center; flex:none; }
.mq-right{ display:flex; align-items:center; gap:16px; }
.mq-sc{ text-align:right; } .mq-sc__v{ font-family:var(--font-condensed); font-weight:800; font-size:22px; color:var(--text-strong); line-height:1; }
.mq-sc__k{ font-family:var(--font-mono); font-size:9px; color:var(--text-subtle); text-transform:uppercase; }
.mq-done{ display:flex; align-items:center; gap:6px; font-weight:800; font-size:13px; color:var(--green-600); }
.mq-empty{ text-align:center; padding:54px 20px; color:var(--text-muted); }
.mq-empty h3{ font-family:var(--font-display); font-weight:900; color:var(--text-strong); margin:10px 0 4px; }
`;
(function(){ if(document.getElementById("mq-css"))return; const s=document.createElement("style"); s.id="mq-css"; s.textContent=MQ_CSS; document.head.appendChild(s); })();

function whyNow(a) {
  const sigs = a.signals || [];
  for (const k of WHY_PRIORITY) {
    const hit = sigs.find((s) => s.kind === k);
    if (hit) return hit;
  }
  return sigs[0] || null;
}

function MorningQueue({ onConfirmed, onError }) {
  const [done, setDone] = useStateQ({});
  const [busy, setBusy] = useStateQ({});   // domain -> true while ITS push is in flight (per-row, not page-wide)
  const [open, setOpen] = useStateQ({});   // domain -> compose/send panel expanded
  const [gone, setGone] = useStateQ({});   // domain -> true (rejected off the list)
  const [leaving, setLeaving] = useStateQ({});   // domain -> true (animating out)
  const [sentGone, setSentGone] = useStateQ({}); // domain -> true (unmounted)

  // Pending removal timers, so we can cancel them if the operator navigates away
  // mid-animation instead of writing state into a detached component. Each entry
  // also carries its notify() so an unmount can still deliver it (see below) —
  // clearTimeout alone would silently drop the refresh + toast, not just the
  // local state write.
  const timersQ = useRefQ([]);
  useEffectQ(() => () => {
    // The child is on its way out, but onConfirmed is a prop owned by the still-
    // mounted App — safe to call after this component unmounts, and it's the only
    // thing that refreshes PE.STREAM and shows the toast. Only setSentGone (local
    // state) is skipped; there's nothing left to update it on.
    timersQ.current.forEach((t) => { clearTimeout(t.id); t.notify(); });
  }, []);

  // Fires ONLY after the server confirmed {sent:true} — never on the click. Removal is
  // optimistic on that confirmation rather than on a /api/candidates round-trip, which
  // would lag the poof by a second and read as broken; the next refresh() confirms it.
  function onSent(domain, contactEmail, companyName) {
    setLeaving((l) => ({ ...l, [domain]: true }));
    const reduce = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // notify() is the shared-state side effect (refresh + toast via onConfirmed,
    // which already calls P.refresh() in app.jsx) — it must run whether or not this
    // component survives. settle() is purely local and only makes sense if it does.
    const notify = () => onConfirmed && onConfirmed(0, `Emailed ${contactEmail} at ${companyName} — cleared from your queue`);
    const settle = () => setSentGone((g) => ({ ...g, [domain]: true }));
    if (reduce) { settle(); notify(); return; }
    // Drop the entry once it fires — otherwise the array just grows for the component's life.
    const id = setTimeout(() => {
      timersQ.current = timersQ.current.filter((t) => t.id !== id);
      settle();
      notify();
    }, 400);
    timersQ.current.push({ id, notify });
  }

  // Today's worklist: net-new with a CONFIRMED in-market signal (actively running
  // ads / hiring / just launched) — the firms a real buying signal says to work NOW.
  // Best-first. Unknown-timing firms aren't buried here; they're for qualification.
  const queue = (PEQ.STREAM || [])
    .filter((a) => a.netNew === true && a.inMarket === "confirmed"
                   && !gone[a.domain] && !sentGone[a.domain])
    .sort((x, y) => (y.total || 0) - (x.total || 0))
    .slice(0, TOP_N);
  const left = queue.filter((a) => !done[a.domain]);

  async function work(domain) {
    if (busy[domain] || done[domain]) return;
    setBusy((b) => ({ ...b, [domain]: true }));
    try {
      // The Morning Queue IS the work-now list — confirming claims it as closer.
      const res = await PEQ.pushDomains([domain], "closer");
      const r = (res.results || []).find((x) => x.domain === domain);
      if (r && r.status === "claimed") {
        setDone((d) => ({ ...d, [domain]: true }));
        await PEQ.refresh();
        onConfirmed && onConfirmed(1);
      } else {
        // Server pushed nothing for this firm — surface why instead of faking success.
        onError && onError(new Error(r && r.reason ? r.reason : "Not worked — this firm wasn't moved into your pipeline"));
      }
    } catch (e) { onError && onError(e); }
    finally { setBusy((b) => { const n = { ...b }; delete n[domain]; return n; }); }
  }

  // Same decision path as the Triage Board's decide() — identical row, identical endpoint.
  async function reject(domain) {
    if (busy[domain] || gone[domain]) return;
    setBusy((b) => ({ ...b, [domain]: true }));
    try {
      const res = await PEQ.decideDomains([domain], "reject");
      const row = (res.results || []).find((x) => x.domain === domain);
      if (row && row.status === "decided") {
        setGone((g) => ({ ...g, [domain]: true }));
        if (row.hubspot_synced === false) {
          onError && onError(new Error(
            `Saved reject for ${domain}, but HubSpot didn't take the status write.`));
        }
        // refresh() swallows its own fetch failures and always resolves — safe inside
        // this try; it can't cause a false "not rejected" rollback after a real success.
        await PEQ.refresh();
      } else {
        onError && onError(new Error("Not rejected — " + domain));
      }
    } catch (e) { onError && onError(e); }
    finally { setBusy((b) => { const n = { ...b }; delete n[domain]; return n; }); }
  }

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>Start here · today's highest-priority to work</div>
          <h2 style={{ margin: "6px 0 0" }}>Morning Queue</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "68ch" }}>
            The shortlist that matters today — a filtered slice of the Triage Board: only net-new, in-market-now, closer-worthy prospects, ranked best-first. Work the top down.
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="mq-empty">
          <IcoQ.Sunrise size={34} style={{ color: "var(--coral-400)" }} />
          <h3>You're clear for now</h3>
          <p>No in-market, net-new prospects waiting. Ingest a list — or run enrichment — and the hottest ones surface here.</p>
        </div>
      ) : (
        <React.Fragment>
          <div className="mq-bar">
            <IcoQ.Sunrise size={18} style={{ color: "var(--coral-500)" }} />
            <div className="mq-bar__t"><b>{left.length}</b> to work{Object.keys(done).length ? ` · ${Object.keys(done).length} done` : ""} · confirmed in-market (active buying signal)</div>
          </div>

          {queue.map((a, i) => {
            const why = whyNow(a);
            const WhyI = why ? (IcoQ[SIG_ICON_Q[why.kind]] || IcoQ.Zap) : IcoQ.Zap;
            const isDone = done[a.domain];
            return (
              <div key={a.domain} className={"mq-row" + (leaving[a.domain] ? " mq-row--leaving" : "")}>
              <div className={"mq-card" + (isDone ? " mq-card--done" : "")}>
                <div className="mq-rank">{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="mq-nm"><PEQ.CompanyLink name={a.name} domain={a.domain} /></div>
                  <div className="mq-meta">{a.domain} · {PEQ.Vertical[a.vertical] || a.vertical}{a.city ? " · " + a.city : ""} · <BadgeQ tone={a.band === "A" ? "green" : "neutral"} variant="soft" size="sm">Band {a.band || "—"}</BadgeQ></div>
                  <div className="mq-why">
                    <span className="mq-why__ic"><WhyI size={13} /></span>
                    {why ? (why.detail || (PEQ.SignalKind[why.kind] || why.kind)) : "In-market on timing — score puts it at the top of the list."}
                  </div>
                </div>
                <div className="mq-right">
                  <div className="mq-sc"><div className="mq-sc__v">{Math.round(a.timing || 0)}</div><div className="mq-sc__k">timing</div></div>
                  <div className="mq-sc"><div className="mq-sc__v">{Math.round(a.total || 0)}</div><div className="mq-sc__k">score</div></div>
                  {isDone
                    ? <div className="mq-done"><IcoQ.CheckCheck size={16} /> Working</div>
                    : <BtnQ variant="primary" size="sm" icon={<IcoQ.Check size={14} />} disabled={!!busy[a.domain]} onClick={() => work(a.domain)}>{busy[a.domain] ? "Starting…" : "Confirm → work"}</BtnQ>}
                  <BtnQ variant="ghost" size="sm" onClick={() => setOpen((o) => ({ ...o, [a.domain]: !o[a.domain] }))}>{open[a.domain] ? "Close" : "Compose ▾"}</BtnQ>
                  <BtnQ variant="ghost" size="sm" disabled={!!busy[a.domain]}
                    onClick={() => reject(a.domain)}>Reject</BtnQ>
                </div>
              </div>
              {open[a.domain] && <PEQ.ComposePanel account={a} onError={onError}
                onSent={(email) => onSent(a.domain, email, a.name)} />}
              </div>
            );
          })}
        </React.Fragment>
      )}
    </div>
  );
}

window.PE.MorningQueue = MorningQueue;
