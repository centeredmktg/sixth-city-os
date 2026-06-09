import React from 'react';

const CSS = `
.ds-ta{ display:flex; flex-direction:column; gap:6px; font-family:var(--font-sans); }
.ds-ta__label{ font-size:13px; font-weight:600; color:var(--text-primary); }
.ds-ta__req{ color:var(--danger-600); margin-left:2px; }
.ds-ta__box{
  border:1px solid var(--border-strong); border-radius:var(--radius-md); background:var(--surface);
  font-family:inherit; font-size:14.5px; line-height:var(--leading-normal); color:var(--text-primary);
  padding:11px 13px; resize:vertical; min-height:96px; outline:none;
  transition:border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-ta__box::placeholder{ color:var(--text-muted); }
.ds-ta__box:focus{ border-color:var(--focus-color); box-shadow:var(--focus-ring); }
.ds-ta__box--err{ border-color:var(--danger-600); }
.ds-ta__row{ display:flex; justify-content:space-between; gap:10px; }
.ds-ta__msg{ font-size:12px; color:var(--text-muted); }
.ds-ta__msg--err{ color:var(--danger-700); }
.ds-ta__count{ font-size:12px; color:var(--text-muted); font-family:var(--font-mono); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-textarea-css')) {
  const s = document.createElement('style'); s.id = 'ds-textarea-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Multi-line text input — feedback prompts, notes. */
export function Textarea({
  label, hint, error, required = false, maxLength, value, id, className = '', ...rest
}) {
  const fid = id || React.useId();
  const count = typeof value === 'string' ? value.length : null;
  return (
    <div className={['ds-ta', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ds-ta__label" htmlFor={fid}>
          {label}{required && <span className="ds-ta__req">*</span>}
        </label>
      )}
      <textarea
        className={['ds-ta__box', error && 'ds-ta__box--err'].filter(Boolean).join(' ')}
        id={fid} maxLength={maxLength} value={value} aria-invalid={!!error} {...rest}
      />
      <div className="ds-ta__row">
        <span className={['ds-ta__msg', error && 'ds-ta__msg--err'].filter(Boolean).join(' ')}>
          {error || hint || ''}
        </span>
        {maxLength && count != null && <span className="ds-ta__count">{count}/{maxLength}</span>}
      </div>
    </div>
  );
}
