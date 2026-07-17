/* ============================================================
   Scoring — the team-adjustable ABCR rubric.
   Sliders/number inputs for every lever (Fit/Timing balance,
   band cutoffs, hub proximity, per-vertical bonuses). A live
   A/B/C/R preview refreshes as you drag; Save persists the
   rubric and re-scores every account. LIVE:
   GET/PUT /api/scoring-config, POST /api/scoring-config/preview.
   ============================================================ */
const { useState: useStateSC, useEffect: useEffectSC, useRef: useRefSC } = React;
const PESC = window.PE;
const IcoSC = PESC.Icons;

const SC_BAND_COLOR = { A: "var(--green-500)", B: "var(--orange-400)", C: "var(--stone-500)", R: "var(--stone-400)" };
const SC_BAND_LABEL = { A: "A · perfect-fit", B: "B · strong", C: "C · maybe", R: "R · park" };

const SC_CSS = `
.sc-wrap{ display:grid; grid-template-columns:1fr 340px; gap:20px; align-items:start; margin-top:6px; }
@media (max-width:1000px){ .sc-wrap{ grid-template-columns:1fr; } }
.sc-group{ background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); margin-bottom:16px; }
.sc-group__h{ padding:13px 18px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.sc-group__h h4{ margin:0; font-size:var(--text-md); }
.sc-group__h .pe-overline{ margin-left:auto; }
.sc-group__b{ padding:14px 18px; }
.sc-row{ display:flex; align-items:center; gap:14px; padding:9px 0; }
.sc-row__k{ width:150px; flex:none; font-size:13px; color:var(--text-body); }
.sc-row__k small{ display:block; color:var(--text-subtle); font-size:11px; }
.sc-row input[type=range]{ flex:1; accent-color:var(--coral-500); }
.sc-row input[type=number]{ width:78px; padding:6px 8px; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:13px; background:var(--surface-base); color:var(--text-strong); }
.sc-row__v{ width:96px; text-align:right; font-family:var(--font-condensed); font-weight:800; color:var(--text-strong); font-size:15px; }
.sc-vgrid{ display:grid; grid-template-columns:1fr 1fr; gap:6px 22px; }
@media (max-width:640px){ .sc-vgrid{ grid-template-columns:1fr; } }
.sc-preview{ position:sticky; top:14px; background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.sc-preview__h{ padding:13px 18px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; gap:9px; }
.sc-preview__h h4{ margin:0; font-size:var(--text-md); }
.sc-preview__b{ padding:16px 18px; }
.sc-brow{ display:flex; align-items:center; gap:11px; padding:8px 0; }
.sc-brow__k{ width:112px; flex:none; font-size:12px; color:var(--text-body); }
.sc-track{ flex:1; height:9px; border-radius:99px; background:var(--stone-150); overflow:hidden; }
.sc-track i{ display:block; height:100%; border-radius:99px; transition:width .18s ease; }
.sc-brow__v{ width:44px; text-align:right; font-family:var(--font-condensed); font-weight:800; color:var(--text-strong); }
.sc-actions{ display:flex; align-items:center; gap:10px; margin-top:14px; }
.sc-btn{ border:none; border-radius:var(--radius-sm); padding:10px 18px; font-weight:700; font-size:13px; cursor:pointer; }
.sc-btn--primary{ background:var(--coral-600); color:#fff; }
.sc-btn--primary:disabled{ opacity:.5; cursor:not-allowed; }
.sc-btn--ghost{ background:transparent; color:var(--text-body); border:1px solid var(--border-subtle); }
.sc-errs{ margin:10px 0 0; padding:11px 14px; background:var(--coral-50); border:1px solid var(--coral-200); border-radius:var(--radius-sm); color:var(--coral-700); font-size:12px; }
.sc-errs li{ margin:2px 0; }
.sc-saved{ font-size:12px; color:var(--green-600); font-weight:700; }
.sc-select{ flex:1; max-width:320px; padding:7px 9px; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); font-size:13px; background:var(--surface-base); color:var(--text-strong); }
.sc-owner-note{ margin:0 0 12px; font-size:12px; color:var(--text-subtle); }
`;
(function(){ if(document.getElementById("sc-css"))return; const s=document.createElement("style"); s.id="sc-css"; s.textContent=SC_CSS; document.head.appendChild(s); })();

// Client mirror of ScoringConfig.validate() — instant feedback; the server is authoritative.
function scValidate(c) {
  const e = [];
  if (!(c.fit_weight >= 0 && c.fit_weight <= 1)) e.push("Fit/Timing balance must be between 0 and 1.");
  if (!(c.band_a > c.band_b && c.band_b > c.band_c && c.band_a <= 100 && c.band_c >= 0))
    e.push("Band cutoffs must satisfy 100 ≥ A > B > C ≥ 0.");
  if (c.proximity_boost < 1) e.push("Proximity boost must be at least 1.0.");
  if (c.staffed_proximity_boost < c.proximity_boost) e.push("Staffed-hub boost must be ≥ the proximity boost.");
  if (c.radius_miles <= 0) e.push("Hub radius must be greater than 0 miles.");
  return e;
}

function scNum(v) { return v === "" || v == null ? 0 : Number(v); }

function ScoringScreen() {
  const [cfg, setCfg] = useStateSC(null);
  const [defaults, setDefaults] = useStateSC(null);
  const [bands, setBands] = useStateSC(null);
  const [total, setTotal] = useStateSC(0);
  const [saving, setSaving] = useStateSC(false);
  const [savedMsg, setSavedMsg] = useStateSC("");
  const tRef = useRefSC(null);

  const [owners, setOwners] = useStateSC([]);
  const [defaultOwner, setDefaultOwner] = useStateSC("");
  const [ownerSaving, setOwnerSaving] = useStateSC(false);
  const [ownerSaved, setOwnerSaved] = useStateSC(false);

  useEffectSC(() => {
    fetch("/api/scoring-config").then((r) => r.json()).then((j) => { setCfg(j.config); setDefaults(j.defaults); });
  }, []);

  useEffectSC(() => {
    fetch("/api/owners").then((r) => r.json()).then((j) => setOwners(j.owners || []));
    fetch("/api/owner-config").then((r) => r.json()).then((j) => setDefaultOwner(j.default_owner_id || ""));
  }, []);

  const saveOwner = () => {
    setOwnerSaving(true); setOwnerSaved(false);
    fetch("/api/owner-config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner_id: defaultOwner }),
    }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok }) => { if (ok) setOwnerSaved(true); })
      .finally(() => setOwnerSaving(false));
  };

  // Debounced live preview — re-scores in memory server-side, persists nothing.
  useEffectSC(() => {
    if (!cfg || scValidate(cfg).length) return;
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      fetch("/api/scoring-config/preview", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
      }).then((r) => r.json()).then((j) => { setBands(j.bands); setTotal(j.total); }).catch(() => {});
    }, 250);
    return () => clearTimeout(tRef.current);
  }, [cfg]);

  if (!cfg) return <div className="pe-page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;

  const errs = scValidate(cfg);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const setVert = (vert, v) => setCfg((c) => ({ ...c, vertical_fit_bonus: { ...c.vertical_fit_bonus, [vert]: v } }));
  const fit = cfg.fit_weight;

  const save = () => {
    setSaving(true); setSavedMsg("");
    fetch("/api/scoring-config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
    }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (ok) { setSavedMsg("Saved — re-scored " + j.rescored + " accounts."); setBands(j.bands); }
        else { setSavedMsg("Couldn't save: " + ((j.detail || []).join(" ") || "invalid rubric")); }
      })
      .catch(() => setSavedMsg("Couldn't reach the server."))
      .finally(() => setSaving(false));
  };

  const numRow = (k, label, sub, step, min) => (
    <div className="sc-row">
      <span className="sc-row__k">{label}{sub && <small>{sub}</small>}</span>
      <input type="number" step={step} min={min} value={cfg[k]}
        onChange={(e) => set(k, scNum(e.target.value))} />
    </div>
  );

  const bandMax = bands ? Math.max(1, ...Object.values(bands)) : 1;

  return (
    <div className="pe-page">
      <div className="q-head">
        <div>
          <div className="pe-overline" style={{ color: "var(--coral-600)" }}>Scoring rubric · tune how accounts rank</div>
          <h2 style={{ margin: "6px 0 0" }}>Scoring</h2>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: "70ch" }}>
            Adjust the levers that decide which accounts rank highest. Drag to see the band split update; Save to apply it and re-score every account in the system.
          </p>
        </div>
      </div>

      <div className="sc-wrap">
        <div>
          {/* Ownership */}
          <div className="sc-group">
            <div className="sc-group__h"><IcoSC.Briefcase size={16} style={{ color: "var(--coral-500)" }} /><h4>Ownership</h4></div>
            <div className="sc-group__b">
              <p className="sc-owner-note">Every company the engine adds to HubSpot is assigned to this person. Required — nothing is created unassigned.</p>
              <div className="sc-row">
                <span className="sc-row__k">Default owner</span>
                <select className="sc-select" value={defaultOwner}
                  onChange={(e) => { setDefaultOwner(e.target.value); setOwnerSaved(false); }}>
                  <option value="">— select —</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
                </select>
              </div>
              <div className="sc-actions">
                <button className="sc-btn sc-btn--primary" onClick={saveOwner} disabled={!defaultOwner || ownerSaving}>
                  {ownerSaving ? "Saving…" : ownerSaved ? "Saved ✓" : "Save owner"}
                </button>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="sc-group">
            <div className="sc-group__h"><IcoSC.Scale size={16} style={{ color: "var(--coral-500)" }} /><h4>Fit vs Timing balance</h4></div>
            <div className="sc-group__b">
              <div className="sc-row">
                <span className="sc-row__k">Weighting<small>higher = fit matters more</small></span>
                <input type="range" min="0" max="1" step="0.05" value={fit}
                  onChange={(e) => set("fit_weight", Number(e.target.value))} />
                <span className="sc-row__v">Fit {fit.toFixed(2)} · Tm {(1 - fit).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bands */}
          <div className="sc-group">
            <div className="sc-group__h"><IcoSC.Gauge size={16} style={{ color: "var(--coral-500)" }} /><h4>Band cutoffs</h4><span className="pe-overline">0–100 · A &gt; B &gt; C</span></div>
            <div className="sc-group__b">
              {numRow("band_a", "A cutoff", "perfect-fit at/above", 1, 0)}
              {numRow("band_b", "B cutoff", "strong", 1, 0)}
              {numRow("band_c", "C cutoff", "below this = park (R)", 1, 0)}
            </div>
          </div>

          {/* Geography */}
          <div className="sc-group">
            <div className="sc-group__h"><IcoSC.MapPin size={16} style={{ color: "var(--coral-500)" }} /><h4>Hub proximity</h4></div>
            <div className="sc-group__b">
              {numRow("proximity_boost", "Proximity boost", "near any hub (×)", 0.01, 1)}
              {numRow("staffed_proximity_boost", "Staffed boost", "near Chicago/Cleveland (×)", 0.01, 1)}
              {numRow("radius_miles", "Radius", "miles counted as local", 5, 1)}
            </div>
          </div>

          {/* Verticals */}
          <div className="sc-group">
            <div className="sc-group__h"><IcoSC.Building size={16} style={{ color: "var(--coral-500)" }} /><h4>Vertical fit bonuses</h4><span className="pe-overline">0–40 pts</span></div>
            <div className="sc-group__b">
              <div className="sc-vgrid">
                {Object.keys(cfg.vertical_fit_bonus).map((vk) => (
                  <div className="sc-row" key={vk} style={{ padding: "6px 0" }}>
                    <span className="sc-row__k" style={{ width: 140 }}>{PESC.Vertical[vk] || vk}</span>
                    <input type="number" step="1" min="0" max="40" value={cfg.vertical_fit_bonus[vk]}
                      onChange={(e) => setVert(vk, scNum(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live preview + actions */}
        <div className="sc-preview">
          <div className="sc-preview__h"><IcoSC.Sliders size={16} style={{ color: "var(--coral-500)" }} /><h4>Band preview</h4><span className="pe-overline" style={{ marginLeft: "auto" }}>{total.toLocaleString("en-US")} accts</span></div>
          <div className="sc-preview__b">
            {bands ? ["A", "B", "C", "R"].map((b) => (
              <div className="sc-brow" key={b}>
                <span className="sc-brow__k">{SC_BAND_LABEL[b]}</span>
                <span className="sc-track"><i style={{ width: ((bands[b] || 0) / bandMax * 100) + "%", background: SC_BAND_COLOR[b] }} /></span>
                <span className="sc-brow__v">{(bands[b] || 0).toLocaleString("en-US")}</span>
              </div>
            )) : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Adjust a lever to preview.</div>}

            {errs.length > 0 && <ul className="sc-errs">{errs.map((e, i) => <li key={i}>{e}</li>)}</ul>}

            <div className="sc-actions">
              <button className="sc-btn sc-btn--primary" onClick={save} disabled={saving || errs.length > 0}>
                {saving ? "Saving…" : "Save & re-score"}
              </button>
              <button className="sc-btn sc-btn--ghost" onClick={() => setCfg(defaults)} disabled={saving}>Reset to defaults</button>
            </div>
            {savedMsg && <div className="sc-saved" style={{ marginTop: 10 }}>{savedMsg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

window.PE.ScoringScreen = ScoringScreen;
