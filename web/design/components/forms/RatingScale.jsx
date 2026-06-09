import React from 'react';

const CSS = `
.ds-rating{ display:flex; flex-direction:column; gap:8px; font-family:var(--font-sans); }
.ds-rating__scale{ display:flex; gap:8px; }
.ds-rating__btn{
  flex:1; min-width:0; height:44px; border-radius:var(--radius-md);
  border:1.5px solid var(--border); background:var(--surface); cursor:pointer;
  font-family:var(--font-mono); font-size:15px; font-weight:500; color:var(--text-secondary);
  display:inline-flex; align-items:center; justify-content:center;
  transition:border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out),
             color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.ds-rating__btn:hover{ border-color:var(--teal-300); color:var(--text-brand); }
.ds-rating__btn:focus-visible{ outline:none; box-shadow:var(--focus-ring); }
.ds-rating__btn[aria-pressed="true"]{ background:var(--brand); border-color:var(--brand); color:var(--on-brand); }
.ds-rating__btn[aria-pressed="true"]:hover{ background:var(--brand-hover); color:#fff; }
.ds-rating__ends{ display:flex; justify-content:space-between; }
.ds-rating__end{ font-size:12px; color:var(--text-muted); }
.ds-rating--na .ds-rating__btn:last-child{ flex:0 0 auto; padding:0 14px; font-family:var(--font-sans); font-size:13px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-rating-css')) {
  const s = document.createElement('style'); s.id = 'ds-rating-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Segmented 1..max rating scale used in 360 surveys. Controlled via value/onChange(n). */
export function RatingScale({
  max = 5, value, onChange, minLabel = 'Strongly disagree', maxLabel = 'Strongly agree',
  allowNA = false, className = '',
}) {
  const items = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className={['ds-rating', allowNA && 'ds-rating--na', className].filter(Boolean).join(' ')}>
      <div className="ds-rating__scale">
        {items.map((n) => (
          <button
            key={n} type="button" className="ds-rating__btn"
            aria-pressed={value === n} onClick={() => onChange && onChange(n)}
          >{n}</button>
        ))}
        {allowNA && (
          <button
            type="button" className="ds-rating__btn"
            aria-pressed={value === 'na'} onClick={() => onChange && onChange('na')}
          >N/A</button>
        )}
      </div>
      {(minLabel || maxLabel) && (
        <div className="ds-rating__ends">
          <span className="ds-rating__end">{minLabel}</span>
          <span className="ds-rating__end">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
