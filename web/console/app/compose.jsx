/* ============================================================
   Shared console components — compose/send panel and company
   link — used by Morning Queue, Triage Board, and Activity.
   Exists once here so those three surfaces don't each carry
   their own copy of find -> compose -> edit -> send.
   ============================================================ */
const { useState: useStateCP } = React;
const PECP = window.PE;
const IcoCP = PECP.Icons;
const { Button: BtnCP } = window.SixthCityMarketingDesignSystem_4d5a9e;

const CP_CSS = `
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
.cp-colink{ color:inherit; text-decoration:none; }
.cp-colink:hover{ text-decoration:underline; }
`;
(function(){ if(document.getElementById("cp-css"))return; const s=document.createElement("style"); s.id="cp-css"; s.textContent=CP_CSS; document.head.appendChild(s); })();

// Icon fallbacks — undefined icon components would crash the render, so resolve safely.
const IcoCompose = IcoCP.Edit || IcoCP.Zap;
const IcoSend = IcoCP.Send || IcoCP.Zap;
const IcoFind = IcoCP.UserPlus || IcoCP.Search || IcoCP.Zap;
const IcoSent = IcoCP.CheckCheck || IcoCP.Check;

// The company name, linked to their own site. `noopener noreferrer` is required —
// without it the opened tab gets a window.opener handle back into the console.
function CompanyLink({ name, domain }) {
  if (!domain) return <React.Fragment>{name}</React.Fragment>;
  return (
    <a className="cp-colink" href={"https://" + domain}
       target="_blank" rel="noopener noreferrer">{name}</a>
  );
}

// The inline compose/send panel: company → find the person → compose FOR that contact →
// edit → send (native Gmail, auto-BCC'd to HubSpot). The single-surface send loop.
function ComposePanel({ account, onError, onSent }) {
  const [contacts, setContacts] = useStateCP(null);   // null = loading
  const [finding, setFinding] = useStateCP(false);
  const [drafts, setDrafts] = useStateCP({});          // email -> {id, subject, body, sending, sent, reason}

  React.useEffect(() => {
    PECP.fetchContacts(account.domain).then(setContacts).catch(() => setContacts([]));
  }, [account.domain]);

  const patch = (email, k, v) => setDrafts((d) => ({ ...d, [email]: { ...d[email], [k]: v } }));

  async function find() {
    setFinding(true);
    try { await PECP.pursueDomains([account.domain]); setContacts(await PECP.fetchContacts(account.domain)); }
    catch (e) { onError && onError(e); }
    finally { setFinding(false); }
  }
  async function compose(email) {
    try {
      const m = await PECP.composeMessage(account.domain, email);
      setDrafts((d) => ({ ...d, [email]: { id: m.id, subject: m.subject, body: m.body } }));
    } catch (e) { onError && onError(e); }
  }
  async function send(email) {
    const dr = drafts[email];
    if (!dr) return;
    patch(email, "sending", true); patch(email, "reason", null);
    try {
      await PECP.editMessage(dr.id, dr.subject, dr.body);   // persist the rep's edit first
      const res = await PECP.sendMessage(dr.id);
      patch(email, "sending", false);
      if (res.sent) { patch(email, "sent", true); onSent && onSent(email); }
      else patch(email, "reason", res.reason || "not_sent");
    } catch (e) { patch(email, "sending", false); onError && onError(e); }
  }

  if (contacts === null) return <div className="mq-cp"><div className="mq-cp__hint">Loading contacts…</div></div>;

  return (
    <div className="mq-cp">
      {contacts.length === 0 ? (
        <div className="mq-cp__find">
          <div className="mq-cp__hint">No contact yet — find the decision-maker at {account.name}.</div>
          <BtnCP variant="secondary" size="sm" icon={<IcoFind size={14} />} disabled={finding} onClick={find}>
            {finding ? "Finding…" : "Find the person"}
          </BtnCP>
        </div>
      ) : contacts.map((c) => {
        const dr = drafts[c.email];
        return (
          <div className="mq-cp__c" key={c.email || c.name}>
            <div className="mq-cp__ch">
              <div><b>{c.name}</b>{c.title ? " · " + c.title : ""}<div className="mq-cp__em">{c.email || "no email on file"}</div></div>
              {!dr && <BtnCP variant="primary" size="sm" icon={<IcoCompose size={13} />} disabled={!c.email} onClick={() => compose(c.email)}>Compose</BtnCP>}
            </div>
            {dr && (dr.sent
              ? <div className="mq-cp__sent"><IcoSent size={15} /> Sent to {c.email}</div>
              : <div className="mq-cp__draft">
                  <input className="mq-cp__subj" value={dr.subject || ""} onChange={(e) => patch(c.email, "subject", e.target.value)} />
                  <textarea className="mq-cp__body" rows={7} value={dr.body || ""} onChange={(e) => patch(c.email, "body", e.target.value)} />
                  <div className="mq-cp__act">
                    <BtnCP variant="primary" size="sm" icon={<IcoSend size={13} />} disabled={dr.sending} onClick={() => send(c.email)}>{dr.sending ? "Sending…" : "Send"}</BtnCP>
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

window.PE.ComposePanel = ComposePanel;
window.PE.CompanyLink = CompanyLink;
