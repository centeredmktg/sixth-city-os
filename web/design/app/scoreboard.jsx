/* ============================================================
   Screen 3 — Attribution Scoreboard (the trust layer)
   lead → source → opportunity → closed-won → revenue, plus
   what's owed. Fair and legible to John, not a vendor invoice.
   Provenance + the machine-sourced flag are obvious & auditable.
   ============================================================ */
const PES = window.PE;
const { Badge: BadgeS, StatBlock: StatBlockS } = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoS = PES.Icons;

const SB_CSS = `
.sb-hero{ display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr; gap:18px; margin-bottom:22px; }
.sb-stat{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
  padding:18px 20px; box-shadow:var(--shadow-sm); }
.sb-stat--feature{ background:var(--ink-700); border-color:transparent; color:#fff; position:relative; overflow:hidden; }
.sb-stat--feature::after{ content:""; position:absolute; inset:0; background:radial-gradient(80% 90% at 100% 0%, rgba(237,106,60,.22), transparent 60%); pointer-events:none; }
.sb-stat__l{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:700; color:var(--text-subtle); margin-bottom:8px; }
.sb-stat--feature .sb-stat__l{ color:var(--orange-400); }
.sb-stat__v{ font-family:var(--font-condensed); font-weight:800; font-size:46px; line-height:.95; color:var(--text-strong); letter-spacing:-.01em; }
.sb-stat--feature .sb-stat__v{ color:#fff; }
.sb-stat__v .c{ color:var(--coral-500); }
.sb-stat__note{ font-size:var(--text-sm); color:var(--text-muted); margin-top:8px; line-height:1.4; }
.sb-stat--feature .sb-stat__note{ color:rgba(255,255,255,.72); }
.sb-stat__sm{ font-family:var(--font-condensed); font-weight:800; font-size:28px; line-height:1; color:var(--text-strong); }

.sb-2col{ display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-bottom:22px; align-items:start; }
.sb-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.sb-card__h{ padding:16px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:10px; }
.sb-card__h h4{ margin:0; font-size:var(--text-lg); }
.sb-card__h .pe-overline{ margin-left:auto; }
.sb-card__b{ padding:18px 20px; }

/* funnel */
.fn{ display:flex; flex-direction:column; gap:11px; }
.fn-row{ display:grid; grid-template-columns:128px 1fr 56px; align-items:center; gap:12px; }
.fn-row__k{ font-size:var(--text-sm); font-weight:700; color:var(--text-body); }
.fn-row__bar{ height:26px; border-radius:var(--radius-sm); background:var(--gradient-ember); display:flex; align-items:center;
  padding:0 10px; color:#fff; font-family:var(--font-mono); font-weight:600; font-size:var(--text-xs); min-width:34px; }
.fn-row__n{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-lg); color:var(--text-strong); text-align:right; }
.fn-row__cv{ font-size:11px; color:var(--text-subtle); font-family:var(--font-mono); }

/* source rollup */
.src{ display:flex; flex-direction:column; gap:12px; }
.src-row{ display:grid; grid-template-columns:1fr auto; gap:6px 12px; align-items:center; padding-bottom:12px; border-bottom:1px solid var(--border-subtle); }
.src-row:last-child{ border-bottom:none; padding-bottom:0; }
.src-row__name{ font-weight:700; color:var(--text-strong); display:flex; align-items:center; gap:8px; }
.src-row__rev{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-xl); color:var(--green-600); }
.src-row__meta{ font-size:var(--text-xs); color:var(--text-subtle); grid-column:1; }
.src-row__bar{ grid-column:1 / -1; height:6px; border-radius:99px; background:var(--stone-200); overflow:hidden; }
.src-row__fill{ height:100%; border-radius:99px; background:var(--green-500); }

/* won table */
.wt{ width:100%; border-collapse:collapse; }
.wt thead th{ text-align:left; font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em;
  font-size:11px; font-weight:700; color:var(--text-subtle); padding:0 14px 10px; border-bottom:1px solid var(--border-default); white-space:nowrap; }
.wt thead th.r, .wt tbody td.r{ text-align:right; }
.wt tbody td{ padding:13px 14px; border-bottom:1px solid var(--border-subtle); font-size:var(--text-sm); vertical-align:middle; }
.wt tbody tr:last-child td{ border-bottom:none; }
.wt tbody tr.no td{ background:var(--stone-50); color:var(--text-muted); }
.wt__name{ font-weight:800; color:var(--text-strong); }
.wt__sub{ font-size:var(--text-xs); color:var(--text-subtle); }
.wt__fee{ font-family:var(--font-mono); font-weight:600; color:var(--text-body); }
.wt__rev{ font-family:var(--font-condensed); font-weight:800; font-size:var(--text-lg); color:var(--green-600); }
.wt__rev.zero{ color:var(--text-subtle); }
.wt__calc{ font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); }
.wt tfoot td{ padding:15px 14px; font-weight:800; color:var(--text-strong); border-top:2px solid var(--border-default); }
.wt tfoot .tot{ font-family:var(--font-condensed); font-size:var(--text-2xl); color:var(--green-600); }
.prov{ display:inline-flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); }

.sb-note{ display:flex; align-items:flex-start; gap:10px; padding:14px 16px; background:var(--surface-cream);
  border:1px solid var(--stone-200); border-radius:var(--radius-md); margin-top:20px; }
.sb-note svg{ color:var(--coral-600); flex:none; margin-top:1px; }
.sb-note__t{ font-size:var(--text-sm); color:var(--text-body); line-height:1.5; }
.sb-note__t b{ color:var(--text-strong); }
.sb-gates{ display:flex; gap:18px; flex-wrap:wrap; margin-top:8px; }
.sb-gate{ display:flex; align-items:center; gap:7px; font-size:var(--text-xs); font-weight:700; color:var(--text-muted); }
.sb-gate svg{ color:var(--green-600); }
`;
(function(){ if(document.getElementById("pe-sb-css"))return; const s=document.createElement("style"); s.id="pe-sb-css"; s.textContent=SB_CSS; document.head.appendChild(s); })();

function Funnel() {
  const max = PES.FUNNEL[0].count;
  return (
    <div className="fn">
      {PES.FUNNEL.map((f, i) => {
        const prev = i ? PES.FUNNEL[i - 1].count : null;
        const cv = prev ? Math.round((f.count / prev) * 100) : null;
        return (
          <div className="fn-row" key={f.stage}>
            <span className="fn-row__k">{f.stage}</span>
            <div className="fn-row__bar" style={{ width: Math.max(6, (f.count / max) * 100) + "%" }}>
              {cv != null && <span>{cv}%</span>}
            </div>
            <span className="fn-row__n">{f.count}</span>
          </div>
        );
      })}
    </div>
  );
}

function SourceRollup() {
  const rows = PES.sourceRollup();
  const max = Math.max(...rows.map((r) => r.revshare), 1);
  return (
    <div className="src">
      {rows.map((r) => (
        <div className="src-row" key={r.source}>
          <span className="src-row__name">
            {r.source === "pagespeed" ? <IcoS.Gauge size={16} style={{ color: "var(--coral-500)" }} /> :
             r.source === "google_places" ? <IcoS.MapPin size={16} style={{ color: "var(--orange-500)" }} /> :
             <IcoS.Dot size={16} style={{ color: "var(--stone-400)" }} />}
            {PES.SourceLabel[r.source]}
          </span>
          <span className="src-row__rev">{r.revshare ? PES.fmtMoney(r.revshare) : "—"}</span>
          <span className="src-row__meta">{r.qualifying} qualifying client{r.qualifying === 1 ? "" : "s"}{r.clients > r.qualifying ? ` · ${r.clients - r.qualifying} not credited` : ""}</span>
          <div className="src-row__bar"><div className="src-row__fill" style={{ width: (r.revshare / max) * 100 + "%" }} /></div>
        </div>
      ))}
    </div>
  );
}

function Scoreboard({ onOpen }) {
  const qCount = PES.WON.filter((w) => w.qualifying).length;
  return (
    <div className="pe-page">
      <div className="q-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>Trust layer · audit any time</div>
          <h2 style={{ margin: "6px 0 0" }}>Attribution Scoreboard</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", maxWidth: "64ch" }}>
            Every machine-sourced lead, from first touch to closed-won revenue — and exactly what the 5% / 12-month rev-share settles against. All inside your HubSpot.
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <BadgeS tone="green" dot>Engagement term active</BadgeS>
        </div>
      </div>

      <div className="sb-hero">
        <div className="sb-stat sb-stat--feature">
          <div className="sb-stat__l">Qualifying 12-mo rev-share owed</div>
          <div className="sb-stat__v">{PES.fmtMoney(PES.TOTAL_OWED)}</div>
          <div className="sb-stat__note">Across {qCount} net-new, machine-sourced, signed clients. Each tail runs 12 months from that client's signing date.</div>
        </div>
        <div className="sb-stat">
          <div className="sb-stat__l">Closed-won</div>
          <div className="sb-stat__v">{PES.FUNNEL[PES.FUNNEL.length - 1].count}</div>
          <div className="sb-stat__note">{qCount} machine-sourced · 1 referral (not credited)</div>
        </div>
        <div className="sb-stat">
          <div className="sb-stat__l">In pipeline</div>
          <div className="sb-stat__v">{PES.FUNNEL[4].count}</div>
          <div className="sb-stat__note">Open opportunities, machine-sourced</div>
        </div>
        <div className="sb-stat">
          <div className="sb-stat__l">Monthly floor</div>
          <div className="sb-stat__v">{PES.fmtMoney(PES.MONTHLY_FLOOR)}</div>
          <div className="sb-stat__note">Credited against rev-share — not additive.</div>
        </div>
      </div>

      <div className="sb-2col">
        <div className="sb-card">
          <div className="sb-card__h"><IcoS.Filter size={18} style={{ color: "var(--coral-500)" }} /><h4>Pipeline funnel</h4><span className="pe-overline">Machine-sourced book</span></div>
          <div className="sb-card__b"><Funnel /></div>
        </div>
        <div className="sb-card">
          <div className="sb-card__h"><IcoS.Layers size={18} style={{ color: "var(--coral-500)" }} /><h4>Revenue by source</h4><span className="pe-overline">Provenance</span></div>
          <div className="sb-card__b"><SourceRollup /></div>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card__h"><IcoS.Coins size={18} style={{ color: "var(--coral-500)" }} /><h4>Closed-won — rev-share detail</h4>
          <span className="pe-overline">5% × service fee × 12 mo</span></div>
        <div className="sb-card__b" style={{ padding: "8px 8px 4px" }}>
          <table className="wt">
            <thead>
              <tr>
                <th>Client</th>
                <th>Tier</th>
                <th className="r">Service fee /mo</th>
                <th>Machine-sourced</th>
                <th>Discovered by</th>
                <th>Signed</th>
                <th className="r">12-mo rev-share</th>
              </tr>
            </thead>
            <tbody>
              {PES.WON.map((w) => (
                <tr key={w.account_domain} className={w.qualifying ? "" : "no"}>
                  <td>
                    <div className="wt__name">{w.name}</div>
                    <div className="wt__sub">{PES.Vertical[w.vertical]} · {w.account_domain}</div>
                  </td>
                  <td><BadgeS tone={w.tier === "Gold" ? "warning" : w.tier === "Silver" ? "neutral" : "neutral"} variant="outline" size="sm">{w.tier}</BadgeS></td>
                  <td className="r"><span className="wt__fee">{PES.fmtMoney(w.service_fee_monthly)}</span></td>
                  <td>
                    {w.machine_sourced
                      ? <BadgeS tone="green" dot icon={<IcoS.Cpu size={12} />}>Machine</BadgeS>
                      : <BadgeS tone="neutral" dot>Referral</BadgeS>}
                  </td>
                  <td><span className="prov">{w.discovered_by === "pagespeed" ? <IcoS.Gauge size={13} /> : w.discovered_by === "google_places" ? <IcoS.MapPin size={13} /> : <IcoS.Dot size={13} />}{PES.SourceLabel[w.discovered_by]}</span></td>
                  <td><span className="pe-mono" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{w.signed_at}</span></td>
                  <td className="r">
                    <div className={"wt__rev" + (w.qualifying ? "" : " zero")}>{w.qualifying ? PES.fmtMoney(w.twelve_mo_rev_share) : "$0"}</div>
                    <div className="wt__calc">{w.qualifying ? `5% × ${PES.fmtMoney(w.service_fee_monthly)} × 12` : w.note}</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6">Total qualifying 12-month rev-share</td>
                <td className="r"><span className="tot">{PES.fmtMoney(PES.TOTAL_OWED)}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="sb-note">
        <IcoS.ShieldCheck size={18} />
        <div className="sb-note__t">
          <b>How an obligation is created.</b> Three gates must all hold — the row is credited only when every one is true. The ${PES.MONTHLY_FLOOR.toFixed(0)}/mo engagement is <b>credited against</b> rev-share, never added on top.
          <div className="sb-gates">
            <span className="sb-gate"><IcoS.Check size={14} /> Net-new logo (no existing accounts or upsells)</span>
            <span className="sb-gate"><IcoS.Check size={14} /> Machine-sourced flag set in HubSpot</span>
            <span className="sb-gate"><IcoS.Check size={14} /> Signed while the term is active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PE.Scoreboard = Scoreboard;
