import React from 'react';

const CSS = `
.ds-tabs{ font-family:var(--font-sans); }
.ds-tabs__list{ display:inline-flex; gap:4px; }
.ds-tabs--underline .ds-tabs__list{ gap:24px; border-bottom:1px solid var(--border); width:100%; }
.ds-tab{ position:relative; display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  font-family:inherit; font-size:14px; font-weight:600; color:var(--text-secondary);
  background:transparent; border:0; padding:10px 2px;
  transition:color var(--duration-fast) var(--ease-out); }
.ds-tab svg{ width:16px; height:16px; }
.ds-tab:hover{ color:var(--text-primary); }
.ds-tab[aria-selected="true"]{ color:var(--text-brand); }
.ds-tabs--underline .ds-tab::after{ content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px;
  background:var(--brand); border-radius:2px; transform:scaleX(0);
  transition:transform var(--duration-base) var(--ease-out); }
.ds-tabs--underline .ds-tab[aria-selected="true"]::after{ transform:scaleX(1); }
.ds-tabs--pill .ds-tabs__list{ background:var(--surface-sunken); padding:4px; border-radius:var(--radius-md);
  border:1px solid var(--border); }
.ds-tabs--pill .ds-tab{ padding:7px 14px; border-radius:var(--radius-sm); }
.ds-tabs--pill .ds-tab[aria-selected="true"]{ background:var(--surface); color:var(--text-brand);
  box-shadow:var(--shadow-xs); }
.ds-tab__count{ font-family:var(--font-mono); font-size:11px; color:var(--text-muted);
  background:var(--neutral-100); border-radius:var(--radius-full); padding:1px 7px; }
.ds-tab[aria-selected="true"] .ds-tab__count{ background:var(--brand-subtle); color:var(--text-brand); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-tabs-css')) {
  const s = document.createElement('style'); s.id = 'ds-tabs-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Tab navigation. items: [{value,label,icon?,count?}]. Controlled via value/onChange. */
export function Tabs({ items = [], value, onChange, variant = 'underline', className = '' }) {
  return (
    <div className={['ds-tabs', `ds-tabs--${variant}`, className].filter(Boolean).join(' ')}>
      <div className="ds-tabs__list" role="tablist">
        {items.map((it) => (
          <button key={it.value} type="button" role="tab" className="ds-tab"
            aria-selected={value === it.value} onClick={() => onChange && onChange(it.value)}>
            {it.icon}{it.label}
            {it.count != null && <span className="ds-tab__count">{it.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
