import React from 'react';

const CSS = `
.ds-check{ display:inline-flex; align-items:flex-start; gap:10px; font-family:var(--font-sans);
  cursor:pointer; user-select:none; }
.ds-check input{ position:absolute; opacity:0; width:0; height:0; }
.ds-check__box{
  width:20px; height:20px; flex:none; margin-top:1px; border-radius:6px;
  border:1.5px solid var(--border-strong); background:var(--surface); color:#fff;
  display:inline-flex; align-items:center; justify-content:center;
  transition:background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
}
.ds-check__box svg{ width:13px; height:13px; opacity:0; transform:scale(0.6);
  transition:opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.ds-check input:checked + .ds-check__box{ background:var(--brand); border-color:var(--brand); }
.ds-check input:checked + .ds-check__box svg{ opacity:1; transform:scale(1); }
.ds-check input:focus-visible + .ds-check__box{ box-shadow:var(--focus-ring); }
.ds-check input:disabled + .ds-check__box{ opacity:0.5; }
.ds-check--disabled{ cursor:not-allowed; opacity:0.7; }
.ds-check__text{ display:flex; flex-direction:column; gap:2px; }
.ds-check__label{ font-size:14px; color:var(--text-primary); line-height:1.35; }
.ds-check__desc{ font-size:12.5px; color:var(--text-muted); line-height:1.4; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-checkbox-css')) {
  const s = document.createElement('style'); s.id = 'ds-checkbox-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Checkbox with optional label and description. */
export function Checkbox({ label, description, checked, disabled = false, className = '', ...rest }) {
  return (
    <label className={['ds-check', disabled && 'ds-check--disabled', className].filter(Boolean).join(' ')}>
      <input type="checkbox" checked={checked} disabled={disabled} {...rest} />
      <span className="ds-check__box" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
             strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
      {(label || description) && (
        <span className="ds-check__text">
          {label && <span className="ds-check__label">{label}</span>}
          {description && <span className="ds-check__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}
