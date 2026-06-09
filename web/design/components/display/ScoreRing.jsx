import React from 'react';

const CSS = `
.ds-ring{ display:inline-flex; flex-direction:column; align-items:center; gap:10px; font-family:var(--font-sans); }
.ds-ring__svg{ display:block; transform:rotate(-90deg); }
.ds-ring__track{ stroke:var(--neutral-200); }
.ds-ring__arc{ transition:stroke-dashoffset 900ms var(--ease-out); }
.ds-ring__center{ display:flex; flex-direction:column; align-items:center; line-height:1; }
.ds-ring__val{ font-weight:700; color:var(--text-primary); letter-spacing:-0.02em; }
.ds-ring__val small{ font-weight:500; color:var(--text-muted); }
.ds-ring__cap{ font-family:var(--font-mono); font-size:10px; letter-spacing:var(--tracking-caps);
  text-transform:uppercase; color:var(--text-muted); margin-top:4px; }
.ds-ring__label{ font-size:13px; color:var(--text-secondary); font-weight:500; }
.ds-ring--inverse .ds-ring__track{ stroke:rgba(255,255,255,0.16); }
.ds-ring--inverse .ds-ring__val{ color:#fff; }
.ds-ring--inverse .ds-ring__val small{ color:rgba(255,255,255,0.6); }
.ds-ring--inverse .ds-ring__cap,.ds-ring--inverse .ds-ring__label{ color:rgba(255,255,255,0.7); }
@media (prefers-reduced-motion: reduce){ .ds-ring__arc{ transition:none; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-ring-css')) {
  const s = document.createElement('style'); s.id = 'ds-ring-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const STROKES = {
  brand: ['#4a9082', '#236054', '#0e2d27'],
  gold:  ['#d8b87c', '#c79f5a', '#b3863f'],
  success: ['#4fae7d', '#2c8a58', '#1f6e44'],
};

/** The 360° score donut. Sweeps an arc to value/max on mount. */
export function ScoreRing({
  value = 0, max = 5, size = 120, thickness, tone = 'brand', inverse = false,
  label, caption, format, className = '',
}) {
  const uid = React.useMemo(() => 'sr' + Math.random().toString(36).slice(2, 8), []);
  const sw = thickness || Math.round(size * 0.1);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const [off, setOff] = React.useState(c);
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setOff(c * (1 - pct)); return; }
    const t = requestAnimationFrame(() => setOff(c * (1 - pct)));
    return () => cancelAnimationFrame(t);
  }, [c, pct]);
  const stops = inverse && tone === 'brand' ? ['#9fccc1', '#5aa492', '#3d8a7a'] : (STROKES[tone] || STROKES.brand);
  const display = format ? format(value) : (Number.isInteger(value) ? value : value.toFixed(1));
  const fs = size * 0.3;

  return (
    <div className={['ds-ring', inverse && 'ds-ring--inverse', className].filter(Boolean).join(' ')}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg className="ds-ring__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stops[0]} />
              <stop offset="55%" stopColor={stops[1]} />
              <stop offset="100%" stopColor={stops[2]} />
            </linearGradient>
          </defs>
          <circle className="ds-ring__track" cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={sw} />
          <circle className="ds-ring__arc" cx={size/2} cy={size/2} r={r} fill="none"
            stroke={`url(#${uid})`} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} />
        </svg>
        <div className="ds-ring__center" style={{ position:'absolute', inset:0, justifyContent:'center' }}>
          <span className="ds-ring__val" style={{ fontSize: fs }}>
            {display}{max && !format && <small style={{ fontSize: fs * 0.45 }}>/{max}</small>}
          </span>
          {caption && <span className="ds-ring__cap">{caption}</span>}
        </div>
      </div>
      {label && <span className="ds-ring__label">{label}</span>}
    </div>
  );
}
