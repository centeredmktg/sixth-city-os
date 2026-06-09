/* ============================================================
   Screen 4 — Account Detail (drill-in)
   The full picture behind one account: evidence trail, score
   breakdown, routing + confirmation history, enriched contact,
   the editable drafted outreach, and the HubSpot stage timeline.
   ============================================================ */
const { useState: useStateD } = React;
const PED = window.PE;
const { Button: BtnD, Badge: BadgeD, ScoreMeter: ScoreMeterD, Avatar: AvatarD, Input: InputD } = window.SixthCityMarketingDesignSystem_4d5a9e;
const IcoD = PED.Icons;

const DET_CSS = `
.d-back{ display:inline-flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer;
  font-family:var(--font-sans); font-weight:700; font-size:var(--text-sm); color:var(--text-muted); padding:4px 0; margin-bottom:14px; }
.d-back:hover{ color:var(--coral-600); }

.d-hero{ display:flex; align-items:center; gap:22px; background:var(--surface-card); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); padding:22px 24px; margin-bottom:22px; }
.d-hero__meter{ flex:none; }
.d-hero__main{ flex:1; min-width:0; }
.d-hero__top{ display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
.d-hero__name{ font-family:var(--font-display); font-weight:900; font-size:var(--text-3xl); letter-spacing:var(--ls-tight); color:var(--text-strong); margin:0; }
.d-hero__meta{ display:flex; align-items:center; gap:14px; color:var(--text-muted); font-size:var(--text-md); font-weight:600; flex-wrap:wrap; }
.d-hero__meta a{ color:var(--text-link); display:inline-flex; align-items:center; gap:5px; }
.d-hero__meta span{ display:inline-flex; align-items:center; gap:5px; }
.d-hero__band{ flex:none; text-align:center; padding-left:22px; border-left:1px solid var(--border-subtle); }
.d-hero__band-l{ font-family:var(--font-condensed); font-weight:800; font-size:64px; line-height:.85; }
.d-hero__band-c{ font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:.1em; font-size:11px; font-weight:700; color:var(--text-subtle); }

.d-grid{ display:grid; grid-template-columns:1fr 348px; gap:22px; align-items:start; }
.d-col{ display:flex; flex-direction:column; gap:22px; min-width:0; }
.d-card{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.d-card__h{ padding:15px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.d-card__h h4{ margin:0; font-size:var(--text-lg); }
.d-card__h .pe-overline{ margin-left:auto; }
.d-card__b{ padding:18px 20px; }

/* score breakdown */
.d-score{ display:flex; flex-direction:column; gap:14px; }
.d-score__rationale{ font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); background:var(--surface-sunken);
  border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:9px 11px; }
.d-axis{ display:grid; grid-template-columns:78px 1fr 42px; align-items:center; gap:12px; }
.d-axis__k{ font-weight:700; font-size:var(--text-sm); color:var(--text-body); }
.d-axis__t{ height:9px; border-radius:99px; background:var(--stone-200); overflow:hidden; }
.d-axis__f{ height:100%; border-radius:99px; }
.d-axis__v{ font-family:var(--font-mono); font-weight:600; font-size:var(--text-sm); text-align:right; color:var(--text-strong); }
.d-axis--total .d-axis__k{ font-weight:800; }

/* signals */
.d-sig{ display:flex; gap:13px; padding:14px 0; border-bottom:1px solid var(--border-subtle); }
.d-sig:last-child{ border-bottom:none; padding-bottom:0; }
.d-sig:first-child{ padding-top:0; }
.d-sig__ico{ width:34px; height:34px; border-radius:var(--radius-sm); display:grid; place-items:center; flex:none; }
.d-sig__main{ flex:1; min-width:0; }
.d-sig__top{ display:flex; align-items:center; gap:9px; margin-bottom:3px; }
.d-sig__kind{ font-weight:800; font-size:var(--text-sm); color:var(--text-strong); }
.d-sig__src{ margin-left:auto; font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); }
.d-sig__detail{ font-size:var(--text-sm); color:var(--text-body); line-height:1.45; }
.d-sig__val{ font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); margin-top:3px; }

/* offer / outreach */
.d-offer-banner{ display:flex; align-items:center; gap:11px; margin-bottom:15px; padding-bottom:14px; border-bottom:1px dashed var(--border-default); }
.d-offer-recipe{ font-family:var(--font-mono); font-size:11px; color:var(--text-subtle); line-height:1.45; }
.d-offer-cta{ margin-top:12px; font-family:var(--font-mono); font-weight:600; font-size:var(--text-sm); color:var(--coral-600); display:inline-flex; align-items:center; gap:7px; }
.d-out__subj{ margin-bottom:12px; }
.d-out__body{ width:100%; border:1px solid var(--border-default); border-radius:var(--radius-md); padding:13px 14px;
  font-family:var(--font-sans); font-size:var(--text-md); line-height:1.6; color:var(--text-body); background:var(--surface-card);
  resize:vertical; min-height:172px; outline:none; }
.d-out__body:focus{ box-shadow:var(--ring); border-color:var(--coral-500); }
.d-out__foot{ display:flex; align-items:center; gap:10px; margin-top:13px; }
.d-out__reason{ font-size:var(--text-xs); color:var(--text-subtle); display:inline-flex; align-items:center; gap:6px; }

/* rail: contact */
.d-contact{ display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.d-contact__n{ font-weight:800; color:var(--text-strong); }
.d-contact__t{ font-size:var(--text-sm); color:var(--text-muted); }
.d-kv{ display:flex; flex-direction:column; gap:9px; }
.d-kv__row{ display:flex; align-items:center; gap:9px; font-size:var(--text-sm); color:var(--text-body); }
.d-kv__row svg{ color:var(--text-subtle); flex:none; }
.d-kv__row a{ color:var(--text-link); }

/* timeline */
.d-tl{ display:flex; flex-direction:column; }
.d-tl__item{ display:grid; grid-template-columns:18px 1fr; gap:11px; padding-bottom:16px; position:relative; }
.d-tl__item:last-child{ padding-bottom:0; }
.d-tl__rail{ display:flex; flex-direction:column; align-items:center; }
.d-tl__dot{ width:11px; height:11px; border-radius:50%; border:2px solid var(--coral-500); background:var(--surface-card); margin-top:3px; z-index:1; }
.d-tl__dot--done{ background:var(--coral-500); }
.d-tl__line{ width:2px; flex:1; background:var(--border-default); margin-top:2px; }
.d-tl__item:last-child .d-tl__line{ display:none; }
.d-tl__lbl{ font-weight:700; font-size:var(--text-sm); color:var(--text-strong); line-height:1.3; }
.d-tl__when{ font-size:var(--text-xs); color:var(--text-subtle); font-family:var(--font-mono); margin-top:1px; }

.d-route{ display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:var(--radius-md);
  background:var(--surface-sunken); border:1px solid var(--border-subtle); margin-bottom:12px; }
.d-route__txt{ font-size:var(--text-sm); }
.d-route__txt b{ color:var(--text-strong); }
.d-sync{ display:flex; align-items:center; gap:9px; font-size:var(--text-sm); color:var(--text-body); margin-bottom:10px; }
.d-sync svg{ color:var(--green-600); }
`;
(function(){ if(document.getElementById("pe-det-css"))return; const s=document.createElement("style"); s.id="pe-det-css"; s.textContent=DET_CSS; document.head.appendChild(s); })();

const SIG_TINT = {
  site_quality: ["var(--heat-hot-bg)", "var(--coral-600)"],
  ai_citation_gap: ["var(--heat-hot-bg)", "var(--coral-600)"],
  ads_stale: ["var(--heat-warm-bg)", "var(--orange-700)"],
  ads_active: ["var(--heat-warm-bg)", "var(--orange-700)"],
  seo_gap: ["var(--heat-cool-bg)", "var(--info)"],
  keyword_gap: ["var(--heat-cool-bg)", "var(--info)"],
  backlink_gap: ["var(--heat-cool-bg)", "var(--info)"],
  content_gap: ["var(--heat-cool-bg)", "var(--info)"],
  local_seo_gap: ["var(--heat-medium-bg)", "#8a5a00"],
  hiring_marketing: ["var(--green-100)", "var(--green-700)"],
  new_location: ["var(--heat-medium-bg)", "#8a5a00"],
  review_velocity: ["var(--heat-medium-bg)", "#8a5a00"],
};
const SIG_ICON = {
  site_quality: IcoD.Gauge, ai_citation_gap: IcoD.Cpu, ads_stale: IcoD.Zap, ads_active: IcoD.Zap,
  seo_gap: IcoD.Search, keyword_gap: IcoD.Search, backlink_gap: IcoD.External, content_gap: IcoD.FileText,
  local_seo_gap: IcoD.MapPin, hiring_marketing: IcoD.Building, new_location: IcoD.MapPin, review_velocity: IcoD.TrendingUp,
};
const SIG_FALLBACK = ["var(--surface-sunken)", "var(--text-muted)"];

function STAGES() { return ["discovered", "scored", "routed", "pushed", "engaged", "opportunity", "closed_won"]; }

function AccountDetail({ id, onBack }) {
  const a = PED.byId[id] || PED.QUEUE[0];
  const off = a.offer;
  const [subject, setSubject] = useStateD(off ? off.subject : a.outreach.subject);
  const [body, setBody] = useStateD(off ? off.body : a.outreach.body);
  const color = PED.bandColor[a.score.band];
  const eff = a.route.effective;
  const stageList = STAGES();
  const curIdx = stageList.indexOf(a.stage);

  const hist = a.history && a.history.length
    ? a.history
    : [["scored", "Jun 8"], ["routed → " + PED.RouteLabel[a.route.recommended], "Jun 8"]];

  return (
    <div className="pe-page">
      <button className="d-back" onClick={onBack}><IcoD.ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Back</button>

      <div className="d-hero">
        <div className="d-hero__meter">
          <ScoreMeterD score={a.score.total} size={104} label={PED.tierFor(a.score.total).label} />
        </div>
        <div className="d-hero__main">
          <div className="d-hero__top">
            <h2 className="d-hero__name">{a.name}</h2>
            {a.stage === "engaged" ? <BadgeD tone="green" dot>Engaged · live</BadgeD>
              : a.stage === "closed_won" ? <BadgeD tone="green" dot>Closed-won</BadgeD>
              : <BadgeD tone="neutral" dot>{a.stage[0].toUpperCase() + a.stage.slice(1)}</BadgeD>}
            {a.pain_qualified && <BadgeD tone="coral">✓ pain-qualified · {new Set(a.signals.map((s) => s.kind)).size} signals</BadgeD>}
          </div>
          <div className="d-hero__meta">
            <span><IcoD.Building size={15} />{PED.Vertical[a.vertical]}</span>
            <span><IcoD.MapPin size={15} />{a.city}, {a.state}</span>
            {a.score.proximity > 1 && <span><IcoD.Route size={15} />near hub · ×{a.score.proximity}</span>}
            <a href={"https://" + a.domain} target="_blank" rel="noreferrer"><IcoD.Globe size={15} />{a.domain}</a>
            {a.hubspot_id && <span className="pe-mono" style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}><IcoD.External size={13} />{a.hubspot_id}</span>}
          </div>
        </div>
        <div className="d-hero__band">
          <div className="d-hero__band-l" style={{ color }}>{a.score.band}</div>
          <div className="d-hero__band-c">Band</div>
        </div>
      </div>

      <div className="d-grid">
        <div className="d-col">
          {/* Score breakdown */}
          <div className="d-card">
            <div className="d-card__h"><IcoD.Gauge size={18} style={{ color: "var(--coral-500)" }} /><h4>Score breakdown</h4><span className="pe-overline">ABCR</span></div>
            <div className="d-card__b">
              <div className="d-score">
                <div className="d-axis"><span className="d-axis__k">Fit</span><div className="d-axis__t"><div className="d-axis__f" style={{ width: a.score.fit + "%", background: "var(--stone-500)" }} /></div><span className="d-axis__v">{a.score.fit}</span></div>
                <div className="d-axis"><span className="d-axis__k">Timing</span><div className="d-axis__t"><div className="d-axis__f" style={{ width: a.score.timing + "%", background: a.score.timing >= PED.IN_MARKET_TIMING ? "var(--coral-500)" : "var(--heat-cool)" }} /></div><span className="d-axis__v">{a.score.timing}</span></div>
                <div className="d-axis d-axis--total"><span className="d-axis__k">Composite</span><div className="d-axis__t" style={{ height: 11 }}><div className="d-axis__f" style={{ width: a.score.total + "%", background: color }} /></div><span className="d-axis__v" style={{ color }}>{a.score.total}</span></div>
                <div className="d-score__rationale">{a.score.rationale} = {a.score.total} → band {a.score.band}</div>
              </div>
            </div>
          </div>

          {/* Evidence trail */}
          <div className="d-card">
            <div className="d-card__h"><IcoD.Layers size={18} style={{ color: "var(--coral-500)" }} /><h4>Signal evidence trail</h4><span className="pe-overline">{a.signals.length} signal{a.signals.length === 1 ? "" : "s"}</span></div>
            <div className="d-card__b">
              {a.signals.map((s, i) => {
                const SIco = SIG_ICON[s.kind] || IcoD.Dot; const [bg, fg] = SIG_TINT[s.kind] || SIG_FALLBACK;
                return (
                  <div className="d-sig" key={i}>
                    <span className="d-sig__ico" style={{ background: bg, color: fg }}><SIco size={17} /></span>
                    <div className="d-sig__main">
                      <div className="d-sig__top">
                        <span className="d-sig__kind">{PED.SignalKind[s.kind]}</span>
                        <span className="d-sig__src">{PED.SourceLabel[s.source]}</span>
                      </div>
                      <div className="d-sig__detail">{s.detail}</div>
                      <div className="d-sig__val">value: {s.value}{s.kind === "site_quality" ? " / 100 (Lighthouse)" : (s.value <= 1 ? " (normalized 0–1)" : "")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissionless offer (PVP/PQS) — Blueprint GTM, or templated outreach */}
          <div className="d-card">
            <div className="d-card__h"><IcoD.Mail size={18} style={{ color: "var(--coral-500)" }} />
              <h4>{off ? "Permissionless offer" : "Drafted outreach"}</h4>
              <span className="pe-overline">{off ? off.recipe : "Editable before send"}</span></div>
            <div className="d-card__b">
              {off && (
                <div className="d-offer-banner">
                  <BadgeD tone={off.kind === "PVP" ? "coral" : "cool"} variant="solid">{off.kind}</BadgeD>
                  <span className="d-offer-recipe">{off.data_recipe}</span>
                </div>
              )}
              <div className="d-out__subj">
                <InputD label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <label className="pe-overline" style={{ display: "block", marginBottom: 7 }}>Body</label>
              <textarea className="d-out__body" value={body} onChange={(e) => setBody(e.target.value)} />
              {off && <div className="d-offer-cta"><IcoD.ArrowRight size={14} /> {off.cta}</div>}
              <div className="d-out__foot">
                <BtnD variant="primary" size="md" icon={<IcoD.Send size={15} />}>Approve & queue in HubSpot</BtnD>
                <BtnD variant="secondary" size="md" icon={<IcoD.Pencil size={15} />}>Save draft</BtnD>
                {!off && a.outreach.reason_signal && (
                  <span className="d-out__reason" style={{ marginLeft: "auto" }}>
                    <IcoD.Zap size={13} /> Hook: {PED.SignalKind[a.outreach.reason_signal]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RAIL */}
        <div className="d-col">
          {/* Routing */}
          <div className="d-card">
            <div className="d-card__h"><IcoD.Route size={18} style={{ color: "var(--coral-500)" }} /><h4>Routing</h4></div>
            <div className="d-card__b">
              <div className="d-route">
                <BadgeD tone={PED.routeTone[eff]} variant="solid">{PED.RouteLabel[eff]}</BadgeD>
                <span className="d-route__txt">
                  {a.route.confirmed
                    ? <span><b>{a.route.confirmed_route && a.route.confirmed_route !== a.route.recommended ? "Overridden" : "Confirmed"}</b> by {a.route.confirmed_by || "ops"}</span>
                    : <span>Recommended — <b>awaiting confirmation</b></span>}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>{a.route.rationale}</p>
              {a.route.history && a.route.history.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="pe-overline" style={{ marginBottom: 10 }}>Confirmation history</div>
                  <div className="d-tl">
                    {a.route.history.map((h, i) => (
                      <div className="d-tl__item" key={i}>
                        <div className="d-tl__rail"><span className="d-tl__dot d-tl__dot--done" /><span className="d-tl__line" /></div>
                        <div><div className="d-tl__lbl">{Array.isArray(h) ? h[0] : h}</div>{Array.isArray(h) && <div className="d-tl__when">{h[1]}</div>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enriched contact */}
          <div className="d-card">
            <div className="d-card__h"><IcoD.Building size={18} style={{ color: "var(--coral-500)" }} /><h4>Enriched contact</h4><span className="pe-overline">csv-lead-enrichment</span></div>
            <div className="d-card__b">
              {a.contact && (
                <React.Fragment>
                  <div className="d-contact">
                    <AvatarD name={a.contact.name} size="md" tone="ink" />
                    <div><div className="d-contact__n">{a.contact.name}</div><div className="d-contact__t">{a.contact.title}</div></div>
                  </div>
                  <div className="d-kv">
                    <div className="d-kv__row"><IcoD.Mail size={15} /><a href={"mailto:" + a.contact.email}>{a.contact.email}</a></div>
                    <div className="d-kv__row"><IcoD.Globe size={15} /><a href={"https://" + a.domain} target="_blank" rel="noreferrer">{a.domain}</a></div>
                    <div className="d-kv__row"><IcoD.MapPin size={15} />{a.city}, {a.state}</div>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>

          {/* HubSpot sync + stage timeline */}
          <div className="d-card">
            <div className="d-card__h"><IcoD.External size={18} style={{ color: "var(--coral-500)" }} /><h4>HubSpot</h4><span className="pe-overline">{a.hubspot_id || "not synced"}</span></div>
            <div className="d-card__b">
              <div className="d-sync"><IcoD.CheckCheck size={16} /> {a.hubspot_id ? "Synced — machine-sourced flag set" : "Not yet pushed"}</div>
              <div className="pe-overline" style={{ margin: "8px 0 12px" }}>Stage timeline</div>
              <div className="d-tl">
                {stageList.map((st, i) => {
                  const done = i <= curIdx;
                  return (
                    <div className="d-tl__item" key={st}>
                      <div className="d-tl__rail"><span className={"d-tl__dot" + (done ? " d-tl__dot--done" : "")} style={{ borderColor: done ? "var(--coral-500)" : "var(--border-default)" }} /><span className="d-tl__line" /></div>
                      <div><div className="d-tl__lbl" style={{ color: done ? "var(--text-strong)" : "var(--text-subtle)" }}>{st.replace("_", "-").replace(/^\w/, (c) => c.toUpperCase())}{i === curIdx ? " — current" : ""}</div></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PE.AccountDetail = AccountDetail;
