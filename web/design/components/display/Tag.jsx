import React from 'react';

const CSS = `
.ds-tag{
  display:inline-flex; align-items:center; gap:6px; font-family:var(--font-sans);
  font-size:13px; font-weight:500; color:var(--text-secondary);
  background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--radius-full);
  padding:5px 12px; white-space:nowrap;
  transition:background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out),
             color var(--duration-fast) var(--ease-out); }
.ds-tag--selected{ background:var(--brand-subtle); border-color:var(--teal-300); color:var(--text-brand); }
.ds-tag--clickable{ cursor:pointer; }
.ds-tag--clickable:hover{ border-color:var(--neutral-400); }
.ds-tag__x{ display:inline-flex; cursor:pointer; color:var(--text-muted); margin:-2px -4px -2px 0;
  border-radius:50%; padding:2px; }
.ds-tag__x:hover{ color:var(--text-primary); background:var(--neutral-100); }
.ds-tag__x svg{ width:13px; height:13px; display:block; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-tag-css')) {
  const s = document.createElement('style'); s.id = 'ds-tag-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const X = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
);

/** Filter / keyword chip, optionally selectable or removable. */
export function Tag({ selected = false, onRemove, onClick, icon, className = '', children, ...rest }) {
  const clickable = !!onClick;
  return (
    <span
      className={['ds-tag', selected && 'ds-tag--selected', clickable && 'ds-tag--clickable', className]
        .filter(Boolean).join(' ')}
      onClick={onClick} {...rest}
    >
      {icon}
      {children}
      {onRemove && (
        <span className="ds-tag__x" role="button" aria-label="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}><X /></span>
      )}
    </span>
  );
}
