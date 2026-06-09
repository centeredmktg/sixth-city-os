import React from 'react';

const CSS = `
.ds-badge{
  display:inline-flex; align-items:center; gap:5px; font-family:var(--font-sans);
  font-size:12px; font-weight:600; line-height:1; letter-spacing:0.01em;
  padding:5px 10px; border-radius:var(--radius-full); white-space:nowrap; border:1px solid transparent; }
.ds-badge__dot{ width:6px; height:6px; border-radius:50%; background:currentColor; }
.ds-badge svg{ width:13px; height:13px; }
.ds-badge--neutral{ background:var(--neutral-100); color:var(--neutral-700); }
.ds-badge--brand{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-badge--success{ background:var(--success-100); color:var(--success-700); }
.ds-badge--warning{ background:var(--warning-100); color:var(--warning-700); }
.ds-badge--danger{ background:var(--danger-100); color:var(--danger-700); }
.ds-badge--gold{ background:var(--gold-100); color:var(--gold-600); }
.ds-badge--outline{ background:transparent; border-color:var(--border-strong); color:var(--text-secondary); }
.ds-badge--solid{ background:var(--brand); color:var(--on-brand); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-badge-css')) {
  const s = document.createElement('style'); s.id = 'ds-badge-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Small status / category label. */
export function Badge({ tone = 'neutral', dot = false, icon, className = '', children, ...rest }) {
  return (
    <span className={['ds-badge', `ds-badge--${tone}`, className].filter(Boolean).join(' ')} {...rest}>
      {dot && <span className="ds-badge__dot" aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}
