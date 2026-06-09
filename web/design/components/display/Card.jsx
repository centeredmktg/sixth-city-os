import React from 'react';

const CSS = `
.ds-card{
  background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-sm); overflow:hidden;
  transition:box-shadow var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out),
             transform var(--duration-base) var(--ease-out); }
.ds-card--pad{ padding:22px; }
.ds-card--flat{ box-shadow:none; }
.ds-card--raised{ box-shadow:var(--shadow-md); }
.ds-card--interactive{ cursor:pointer; }
.ds-card--interactive:hover{ box-shadow:var(--shadow-lg); transform:translateY(-2px); border-color:var(--border-strong); }
.ds-card--dark{ background:var(--gradient-dark); border-color:transparent; color:var(--text-inverse); }
.ds-card--brand{ background:var(--gradient-brand); border-color:transparent; color:#fff; box-shadow:var(--shadow-brand); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-card-css')) {
  const s = document.createElement('style'); s.id = 'ds-card-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Surface container. The default white card; also dark and brand-gradient variants. */
export function Card({
  tone = 'default', padded = true, elevation = 'sm', interactive = false,
  as: Tag = 'div', className = '', children, ...rest
}) {
  const cls = [
    'ds-card',
    padded && 'ds-card--pad',
    elevation === 'none' && 'ds-card--flat',
    elevation === 'md' && 'ds-card--raised',
    interactive && 'ds-card--interactive',
    tone === 'dark' && 'ds-card--dark',
    tone === 'brand' && 'ds-card--brand',
    className,
  ].filter(Boolean).join(' ');
  return <Tag className={cls} {...rest}>{children}</Tag>;
}
