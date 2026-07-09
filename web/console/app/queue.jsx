/* ============================================================
   Morning Queue — "if you do nothing else today, work these."
   The focused daily shortlist: net-new, closer-bound, in-market-
   NOW prospects ranked best-first, each with its "why now" and a
   one-click confirm -> push. (Triage = full board; Accounts =
   whole book; this = today's top to act on.) LIVE: PE.STREAM.
   ============================================================ */
const { useState: useStateQ } = React;
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
  box-shadow:var(--shadow-sm); padding:15px 18px; margin-bottom:11px; transition:opacity var(--tap-transition); }
.mq-card--done{ opacity:.55; background:var(--surface-cream); }
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
.mq-cp{ margin:-6px 0 14px; padding:14px 18px; background:var(--surface-cream); border:1px solid var(--border-subtle);
  border-top:none; border-radius:0 0 var(--radius-lg) var(--radius-lg); }
.mq-cp__hint{ font-size:12px; color:var(--text-muted); }
.mq-cp__find{ display:flex; align-items:center; gap:14px; }
.mq-cp__c{ padding:10px 0; border-bottom:1px solid var(--border-subtle); }
.mq-cp__c:last-child{ border-bottom:none; }
.mq-cp__ch{ display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:13px; color:var(--text-body); }
.mq-cp__em{ font-size:11px; color:var(--text-subtle); font-family:var(--font-mono); margin-top:1px; }
.mq-cp__draft{ margin-top:10px; }
.mq-cp__subj{ width:100%; padding:8px 10px; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); font-size:13px; font-weight:700; background:var(--surface-card); color:var(--text-strong); margin-bottom:7px; }
.mq-cp__body{ width:100%; padding:9px 11px; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); font-size:13px; line-height:1.5; background:var(--surface-card); color:var(--text-body); resize:vertical; font-family:inherit; }
.mq-cp__act{ display:flex; align-items:center; gap:12px; margin-top:9px; }
.mq-cp__warn{ font-size:11px; color:var(--coral-700); }
.mq-cp__sent{ display:flex; align-items:center; gap:7px; margin-top:8px; font-weight:800; font-size:13px; color:var(--green-600); }
`;
(function(){ if(document.getElementById("mq-css"))return; const s=document.createElement("style"); s.id="mq-css"; s.textContent=MQ_CSS; document.head.appendChild(s); })();

// Icon fallbacks — undefined icon components would crash the render, so resolve safely.
const IcoCompose = IcoQ.Edit || IcoQ.Zap;
const IcoSend = IcoQ.Send || IcoQ.Zap;
const IcoFind = IcoQ.UserPlus || IcoQ.Search || IcoQ.Zap;
const IcoSent = IcoQ.CheckCheck || IcoQ.Check;

function whyNow(a) {
  const sigs = a.signals || [];
  for (const k of WHY_PRIORITY) {
    const hit = sigs.find((s) => s.kind === k);
    if (hit) return hit;
  }
  return sigs[0] || null;
}

// The inline compose/send panel: company → find the person → compose FOR that contact →
// edit → send (native Gmail, auto-BCC'd to HubSpot). The single-surface send loop.
function MQComposePanel({ account, onError }) {
  const [contacts, setContacts] = useStateQ(null);   // null = loading
  const [finding, setFinding] = useStateQ(false);
  const [drafts, setDrafts] = useStateQ({});          // email -> {id, subject, body, sending, sent, reason}

  React.useEffect(() => {
    PEQ.fetchContacts(account.domain).then(setContacts).catch(() => setContacts([]));
  }, [account.domain]);

  const patch = (email, k, v) => setDrafts((d) => ({ ...d, [email]: { ...d[email], [k]: v } }));

  async function find() {
    setFinding(true);
    try { await PEQ.pursueDomains([account.domain]); setContacts(await PEQ.fetchContacts(account.domain)); }
    catch (e) { onError && onError(e); }
    finally { setFinding(false); }
  }
  async function compose(email) {
    try {
      const m = await PEQ.composeMessage(account.domain, email);
      setDrafts((d) => ({ ...d, [email]: { id: m.id, subject: m.subject, body: m.body } }));
    } catch (e) { onError && onError(e); }
  }
  async function send(email) {
    const dr = drafts[email];
    if (!dr) return;
    patch(email, "sending", true); patch(email, "reason", null);
    try {
      await PEQ.editMessage(dr.id, dr.subject, dr.body);   // persist the rep's edit first
      const res = await PEQ.sendMessage(dr.id);
      patch(email, "sending", false);
      if (res.sent) patch(email, "sent", true);
      else patch(email, "reason", res.reason || "not_sent");
    } catch (e) { patch(email, "sending", false); onError && onError(e); }
  }

  if (contacts === null) return <div className="mq-cp"><div className="mq-cp__hint">Loading contacts…</div></div>;

  return (
    <div className="mq-cp">
      {contacts.length === 0 ? (
        <div className="mq-cp__find">
          <div className="mq-cp__hint">No contact yet — find the decision-maker at {account.name}.</div>
          <BtnQ variant="secondary" size="sm" icon={<IcoFind size={14} />} disabled={finding} onClick={find}>
            {finding ? "Finding…" : "Find the person"}
          </BtnQ>
        </div>
      ) : contacts.map((c) => {
        const dr = drafts[c.email];
        return (
          <div className="mq-cp__c" key={c.email || c.name}>
            <div className="mq-cp__ch">
              <div><b>{c.name}</b>{c.title ? " · " + c.title : ""}<div className="mq-cp__em">{c.email || "no email on file"}</div></div>
              {!dr && <BtnQ variant="primary" size="sm" icon={<IcoCompose size={13} />} disabled={!c.email} onClick={() => compose(c.email)}>Compose</BtnQ>}
            </div>
            {dr && (dr.sent
              ? <div className="mq-cp__sent"><IcoSent size={15} /> Sent to {c.email}</div>
              : <div className="mq-cp__draft">
                  <input className="mq-cp__subj" value={dr.subject || ""} onChange={(e) => patch(c.email, "subject", e.target.value)} />
                  <textarea className="mq-cp__body" rows={7} value={dr.body || ""} onChange={(e) => patch(c.email, "body", e.target.value)} />
                  <div className="mq-cp__act">
                    <BtnQ variant="primary" size="sm" icon={<IcoSend size={13} />} disabled={dr.sending} onClick={() => send(c.email)}>{dr.sending ? "Sending…" : "Send"}</BtnQ>
                    {dr.reason === "connect_gmail" && <span className="mq-cp__warn">Connect Gmail to send — log in once to grant access.</span>}
                    {dr.reason && dr.reason !== "connect_gmail" && <span className="mq-cp__warn">Couldn't send ({dr.reason}).</span>}
                  </div>
                </div>)}
          </div>
        );
      })}
    </div>
  );
}

function MorningQueue({ onConfirmed, onError }) {
  const [done, setDone] = useStateQ({});
  const [busy, setBusy] = useStateQ({});   // domain -> true while ITS push is in flight (per-row, not page-wide)
  const [open, setOpen] = useStateQ({});   // domain -> compose/send panel expanded

  // Today's worklist: net-new with a CONFIRMED in-market signal (actively running
  // ads / hiring / just launched) — the firms a real buying signal says to work NOW.
  // Best-first. Unknown-timing firms aren't buried here; they're for qualification.
  const queue = (PEQ.STREAM || [])
    .filter((a) => a.netNew === true && a.inMarket === "confirmed")
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
        onError && onError(new Error(r && r.reason ? r.reason : "Not claimed — nothing was pushed to HubSpot"));
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
            The shortlist that matters today — net-new, in-market-now, closer-bound prospects ranked best-first. Work the top down; confirming pushes the firm into HubSpot.
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
              <React.Fragment key={a.domain}>
              <div className={"mq-card" + (isDone ? " mq-card--done" : "")}>
                <div className="mq-rank">{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="mq-nm">{a.name}</div>
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
                    ? <div className="mq-done"><IcoQ.CheckCheck size={16} /> Pushed</div>
                    : <BtnQ variant="primary" size="sm" icon={<IcoQ.Check size={14} />} disabled={!!busy[a.domain]} onClick={() => work(a.domain)}>{busy[a.domain] ? "Pushing…" : "Confirm → push"}</BtnQ>}
                  <BtnQ variant="ghost" size="sm" onClick={() => setOpen((o) => ({ ...o, [a.domain]: !o[a.domain] }))}>{open[a.domain] ? "Close" : "Compose ▾"}</BtnQ>
                </div>
              </div>
              {open[a.domain] && <MQComposePanel account={a} onError={onError} />}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      )}
    </div>
  );
}

window.PE.MorningQueue = MorningQueue;
