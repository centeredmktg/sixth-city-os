import React from 'react';

const CSS = `
.ds-stat{ display:flex; flex-direction:column; gap:4px; font-family:var(--font-sans); }
.ds-stat__label{ font-family:var(--font-mono); font-size:10.5px; letter-spacing:var(--tracking-caps);
  text-transform:uppercase; color:var(--text-muted); }
.ds-stat__value{ font-size:30px; font-weight:700; color:var(--text-primary); letter-spacing:-0.02em; line-height:1.05; }
.ds-stat__value small{ font-size:0.5em; font-weight:600; color:var(--text-muted); margin-left:2px; }
.ds-stat__delta{ display:inline-flex; align-items:center; gap:3px; font-size:12.5px; font-weight:600; margin-top:2px; }
.ds-stat__delta svg{ width:13px; height:13px; }
.ds-stat__delta--up{ color:var(--success-700); }
.ds-stat__delta--down{ color:var(--danger-700); }
.ds-stat__delta--flat{ color:var(--text-muted); }
.ds-stat--inverse .ds-stat__label{ color:rgba(255,255,255,0.6); }
.ds-stat--inverse .ds-stat__value{ color:#fff; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-stat-css')) {
  const s = document.createElement('style'); s.id = 'ds-stat-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'up' ? <path d="M12 19V5M5 12l7-7 7 7"/> : dir === 'down' ? <path d="M12 5v14M5 12l7 7 7-7"/> : <path d="M5 12h14"/>}
  </svg>
);

/** Compact metric — label, big value, optional delta. */
export function Stat({ label, value, unit, delta, deltaDir, inverse = false, className = '' }) {
  const dir = deltaDir || (typeof delta === 'number' ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') : 'flat');
  return (
    <div className={['ds-stat', inverse && 'ds-stat--inverse', className].filter(Boolean).join(' ')}>
      {label && <span className="ds-stat__label">{label}</span>}
      <span className="ds-stat__value">{value}{unit && <small>{unit}</small>}</span>
      {delta != null && (
        <span className={`ds-stat__delta ds-stat__delta--${dir}`}>
          <Arrow dir={dir} />{typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}` : delta}
        </span>
      )}
    </div>
  );
}
