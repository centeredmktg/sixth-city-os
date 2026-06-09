import React from 'react';

const CSS = `
.ds-switch{ display:inline-flex; align-items:center; gap:10px; font-family:var(--font-sans);
  cursor:pointer; user-select:none; }
.ds-switch input{ position:absolute; opacity:0; width:0; height:0; }
.ds-switch__track{
  width:42px; height:24px; flex:none; border-radius:var(--radius-full);
  background:var(--neutral-300); position:relative;
  transition:background var(--duration-base) var(--ease-out); }
.ds-switch__track::after{ content:""; position:absolute; top:2px; left:2px; width:20px; height:20px;
  border-radius:50%; background:#fff; box-shadow:var(--shadow-sm);
  transition:transform var(--duration-base) var(--ease-out); }
.ds-switch input:checked + .ds-switch__track{ background:var(--brand); }
.ds-switch input:checked + .ds-switch__track::after{ transform:translateX(18px); }
.ds-switch input:focus-visible + .ds-switch__track{ box-shadow:var(--focus-ring); }
.ds-switch input:disabled + .ds-switch__track{ opacity:0.5; }
.ds-switch--sm .ds-switch__track{ width:34px; height:20px; }
.ds-switch--sm .ds-switch__track::after{ width:16px; height:16px; }
.ds-switch--sm input:checked + .ds-switch__track::after{ transform:translateX(14px); }
.ds-switch__label{ font-size:14px; color:var(--text-primary); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-switch-css')) {
  const s = document.createElement('style'); s.id = 'ds-switch-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** On/off toggle. */
export function Switch({ label, size = 'md', checked, disabled = false, className = '', ...rest }) {
  return (
    <label className={['ds-switch', size === 'sm' && 'ds-switch--sm', className].filter(Boolean).join(' ')}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} {...rest} />
      <span className="ds-switch__track" aria-hidden="true" />
      {label && <span className="ds-switch__label">{label}</span>}
    </label>
  );
}
