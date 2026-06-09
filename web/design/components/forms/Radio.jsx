import React from 'react';

const CSS = `
.ds-radio{ display:inline-flex; align-items:flex-start; gap:10px; font-family:var(--font-sans);
  cursor:pointer; user-select:none; }
.ds-radio input{ position:absolute; opacity:0; width:0; height:0; }
.ds-radio__dot{
  width:20px; height:20px; flex:none; margin-top:1px; border-radius:50%;
  border:1.5px solid var(--border-strong); background:var(--surface);
  display:inline-flex; align-items:center; justify-content:center;
  transition:border-color var(--duration-fast) var(--ease-out); }
.ds-radio__dot::after{ content:""; width:9px; height:9px; border-radius:50%; background:var(--brand);
  transform:scale(0); transition:transform var(--duration-fast) var(--ease-out); }
.ds-radio input:checked + .ds-radio__dot{ border-color:var(--brand); }
.ds-radio input:checked + .ds-radio__dot::after{ transform:scale(1); }
.ds-radio input:focus-visible + .ds-radio__dot{ box-shadow:var(--focus-ring); }
.ds-radio input:disabled + .ds-radio__dot{ opacity:0.5; }
.ds-radio--card{ border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 14px;
  background:var(--surface); transition:border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out); }
.ds-radio--card:hover{ border-color:var(--border-strong); }
.ds-radio--card:has(input:checked){ border-color:var(--brand); background:var(--brand-subtle); }
.ds-radio__text{ display:flex; flex-direction:column; gap:2px; }
.ds-radio__label{ font-size:14px; color:var(--text-primary); line-height:1.35; }
.ds-radio__desc{ font-size:12.5px; color:var(--text-muted); line-height:1.4; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-radio-css')) {
  const s = document.createElement('style'); s.id = 'ds-radio-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Single radio option. Group by sharing a `name`. Use `card` for selectable tiles. */
export function Radio({ label, description, card = false, disabled = false, className = '', ...rest }) {
  return (
    <label className={['ds-radio', card && 'ds-radio--card', className].filter(Boolean).join(' ')}>
      <input type="radio" disabled={disabled} {...rest} />
      <span className="ds-radio__dot" aria-hidden="true" />
      {(label || description) && (
        <span className="ds-radio__text">
          {label && <span className="ds-radio__label">{label}</span>}
          {description && <span className="ds-radio__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}
