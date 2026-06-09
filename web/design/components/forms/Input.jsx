import React from 'react';

const CSS = `
.ds-field{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.ds-field__label{ font-size:13px; font-weight:600; color:var(--text-primary); letter-spacing:var(--tracking-snug); }
.ds-field__req{ color:var(--danger-600); margin-left:2px; }
.ds-field__wrap{
  display:flex; align-items:center; gap:8px; background:var(--surface);
  border:1px solid var(--border-strong); border-radius:var(--radius-md);
  padding:0 12px; height:42px;
  transition:border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-field__wrap:focus-within{ border-color:var(--focus-color); box-shadow:var(--focus-ring); }
.ds-field__wrap--err{ border-color:var(--danger-600); }
.ds-field__wrap--err:focus-within{ box-shadow:0 0 0 3px rgba(179,74,60,0.22); }
.ds-field__wrap--disabled{ background:var(--surface-sunken); opacity:0.7; pointer-events:none; }
.ds-field__icon{ display:inline-flex; color:var(--text-muted); font-size:17px; }
.ds-field__icon svg{ width:1.05em; height:1.05em; display:block; }
.ds-field__input{
  flex:1; min-width:0; border:0; outline:none; background:transparent;
  font-family:inherit; font-size:14.5px; color:var(--text-primary); height:100%;
}
.ds-field__input::placeholder{ color:var(--text-muted); }
.ds-field__msg{ font-size:12px; color:var(--text-muted); }
.ds-field__msg--err{ color:var(--danger-700); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-field-css')) {
  const s = document.createElement('style'); s.id = 'ds-field-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Labelled text input with optional icons, hint and error. */
export function Input({
  label, hint, error, required = false, iconLeft, iconRight,
  disabled = false, id, className = '', ...rest
}) {
  const fid = id || React.useId();
  const wrapCls = ['ds-field__wrap', error && 'ds-field__wrap--err', disabled && 'ds-field__wrap--disabled']
    .filter(Boolean).join(' ');
  return (
    <div className={['ds-field', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ds-field__label" htmlFor={fid}>
          {label}{required && <span className="ds-field__req">*</span>}
        </label>
      )}
      <div className={wrapCls}>
        {iconLeft && <span className="ds-field__icon">{iconLeft}</span>}
        <input className="ds-field__input" id={fid} disabled={disabled} aria-invalid={!!error} {...rest} />
        {iconRight && <span className="ds-field__icon">{iconRight}</span>}
      </div>
      {(error || hint) && (
        <span className={['ds-field__msg', error && 'ds-field__msg--err'].filter(Boolean).join(' ')}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
