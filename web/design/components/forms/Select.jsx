import React from 'react';

const CSS = `
.ds-sel{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.ds-sel__label{ font-size:13px; font-weight:600; color:var(--text-primary); }
.ds-sel__wrap{ position:relative; display:flex; align-items:center; }
.ds-sel__el{
  appearance:none; -webkit-appearance:none; width:100%; height:42px;
  font-family:inherit; font-size:14.5px; color:var(--text-primary);
  background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--radius-md);
  padding:0 38px 0 13px; cursor:pointer; outline:none;
  transition:border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-sel__el:focus{ border-color:var(--focus-color); box-shadow:var(--focus-ring); }
.ds-sel__el:disabled{ background:var(--surface-sunken); opacity:0.7; cursor:not-allowed; }
.ds-sel__el[data-placeholder="true"]{ color:var(--text-muted); }
.ds-sel__chev{ position:absolute; right:13px; pointer-events:none; color:var(--text-muted);
  display:inline-flex; }
.ds-sel__chev svg{ width:16px; height:16px; display:block; }
.ds-sel__msg{ font-size:12px; color:var(--text-muted); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-select-css')) {
  const s = document.createElement('style'); s.id = 'ds-select-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

/** Styled native select. Pass options as [{value,label}] or use children <option>s. */
export function Select({
  label, hint, options, placeholder, value, id, className = '', children, ...rest
}) {
  const fid = id || React.useId();
  const isPlaceholder = placeholder && (value === '' || value == null);
  return (
    <div className={['ds-sel', className].filter(Boolean).join(' ')}>
      {label && <label className="ds-sel__label" htmlFor={fid}>{label}</label>}
      <div className="ds-sel__wrap">
        <select className="ds-sel__el" id={fid} value={value} data-placeholder={isPlaceholder || undefined} {...rest}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options
            ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
            : children}
        </select>
        <span className="ds-sel__chev"><Chevron /></span>
      </div>
      {hint && <span className="ds-sel__msg">{hint}</span>}
    </div>
  );
}
