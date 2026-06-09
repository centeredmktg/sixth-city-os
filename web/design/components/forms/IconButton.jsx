import React from 'react';

const CSS = `
.ds-iconbtn{
  --_s:40px;
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s); height:var(--_s); flex:none; padding:0; cursor:pointer;
  border-radius:var(--radius-md); border:1px solid transparent; color:var(--text-secondary);
  background:transparent;
  transition:background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out),
             border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.ds-iconbtn svg{ width:1.2em; height:1.2em; display:block; }
.ds-iconbtn{ font-size:18px; }
.ds-iconbtn--sm{ --_s:32px; font-size:16px; border-radius:var(--radius-sm); }
.ds-iconbtn--lg{ --_s:48px; font-size:20px; }
.ds-iconbtn:focus-visible{ outline:none; box-shadow:var(--focus-ring); }
.ds-iconbtn:active{ transform:scale(0.94); }
.ds-iconbtn[disabled]{ opacity:0.4; pointer-events:none; }

.ds-iconbtn--ghost:hover{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-iconbtn--subtle{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-iconbtn--subtle:hover{ background:var(--brand-subtle-hover); }
.ds-iconbtn--outline{ border-color:var(--border-strong); color:var(--text-secondary); background:var(--surface); }
.ds-iconbtn--outline:hover{ background:var(--surface-sunken); }
.ds-iconbtn--solid{ background:var(--brand); color:var(--on-brand); }
.ds-iconbtn--solid:hover{ background:var(--brand-hover); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-iconbtn-css')) {
  const s = document.createElement('style'); s.id = 'ds-iconbtn-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Square, icon-only button. Always pass an accessible label. */
export function IconButton({
  variant = 'ghost', size = 'md', label, disabled = false, className = '', children, ...rest
}) {
  const cls = ['ds-iconbtn', `ds-iconbtn--${variant}`, size !== 'md' && `ds-iconbtn--${size}`, className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} type="button" aria-label={label} title={label} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
