import React from 'react';

const CSS = `
.ds-progress{ display:flex; flex-direction:column; gap:7px; font-family:var(--font-sans); width:100%; }
.ds-progress__head{ display:flex; justify-content:space-between; align-items:baseline; }
.ds-progress__label{ font-size:13px; font-weight:500; color:var(--text-secondary); white-space:nowrap; }
.ds-progress__val{ font-family:var(--font-mono); font-size:12px; color:var(--text-muted); }
.ds-progress__track{ height:8px; border-radius:var(--radius-full); background:var(--neutral-200); overflow:hidden; }
.ds-progress--lg .ds-progress__track{ height:12px; }
.ds-progress__fill{ height:100%; border-radius:inherit; background:var(--gradient-brand);
  transition:width 700ms var(--ease-out); }
.ds-progress__fill--gold{ background:linear-gradient(90deg, var(--gold-400), var(--gold-600)); }
.ds-progress__fill--success{ background:linear-gradient(90deg, var(--success-600), var(--success-700)); }
@media (prefers-reduced-motion: reduce){ .ds-progress__fill{ transition:none; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-progress-css')) {
  const s = document.createElement('style'); s.id = 'ds-progress-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Linear progress / completion bar. */
export function ProgressBar({
  value = 0, max = 100, label, showValue = false, tone = 'brand', size = 'md',
  format, className = '',
}) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setW(pct); return; }
    const t = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  const valText = format ? format(value, max) : `${Math.round(pct)}%`;
  return (
    <div className={['ds-progress', size === 'lg' && 'ds-progress--lg', className].filter(Boolean).join(' ')}>
      {(label || showValue) && (
        <div className="ds-progress__head">
          {label && <span className="ds-progress__label">{label}</span>}
          {showValue && <span className="ds-progress__val">{valText}</span>}
        </div>
      )}
      <div className="ds-progress__track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={['ds-progress__fill', tone !== 'brand' && `ds-progress__fill--${tone}`].filter(Boolean).join(' ')}
          style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
