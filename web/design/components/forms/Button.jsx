import React from 'react';

const CSS = `
.ds-btn{
  --_h:40px; --_px:18px; --_fs:14px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  height:var(--_h); padding:0 var(--_px); font-size:var(--_fs);
  font-family:var(--font-sans); font-weight:600; letter-spacing:var(--tracking-snug);
  border-radius:var(--radius-md); border:1px solid transparent; cursor:pointer;
  text-decoration:none; white-space:nowrap; user-select:none;
  transition:background var(--duration-fast) var(--ease-out),
             border-color var(--duration-fast) var(--ease-out),
             box-shadow var(--duration-fast) var(--ease-out),
             transform var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}
.ds-btn:focus-visible{ outline:none; box-shadow:var(--focus-ring); }
.ds-btn:active{ transform:translateY(0.5px) scale(0.99); }
.ds-btn[disabled],.ds-btn[aria-disabled="true"]{ opacity:0.45; pointer-events:none; box-shadow:none; }
.ds-btn--sm{ --_h:34px; --_px:14px; --_fs:13px; border-radius:var(--radius-sm); }
.ds-btn--lg{ --_h:48px; --_px:24px; --_fs:16px; }
.ds-btn--block{ display:flex; width:100%; }
.ds-btn__icon{ display:inline-flex; }
.ds-btn__icon svg{ width:1.15em; height:1.15em; display:block; }

.ds-btn--primary{ background:var(--brand); color:var(--on-brand); box-shadow:var(--shadow-brand); }
.ds-btn--primary:hover{ background:var(--brand-hover); }
.ds-btn--primary:active{ background:var(--brand-active); }

.ds-btn--secondary{ background:var(--surface); color:var(--text-primary); border-color:var(--border-strong); box-shadow:var(--shadow-xs); }
.ds-btn--secondary:hover{ background:var(--surface-sunken); border-color:var(--neutral-400); }

.ds-btn--subtle{ background:var(--brand-subtle); color:var(--text-brand); }
.ds-btn--subtle:hover{ background:var(--brand-subtle-hover); }

.ds-btn--ghost{ background:transparent; color:var(--text-secondary); }
.ds-btn--ghost:hover{ background:var(--brand-subtle); color:var(--text-brand); }

.ds-btn--danger{ background:var(--danger-600); color:#fff; }
.ds-btn--danger:hover{ background:var(--danger-700); }

.ds-btn--inverse{ background:#fff; color:var(--teal-800); }
.ds-btn--inverse:hover{ background:var(--neutral-100); }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-button-css')) {
  const s = document.createElement('style'); s.id = 'ds-button-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Primary action control for 360. */
export function Button({
  variant = 'primary', size = 'md', iconLeft, iconRight, fullWidth = false,
  as = 'button', href, type = 'button', disabled = false, className = '', children, ...rest
}) {
  const cls = [
    'ds-btn', `ds-btn--${variant}`,
    size !== 'md' && `ds-btn--${size}`,
    fullWidth && 'ds-btn--block', className,
  ].filter(Boolean).join(' ');

  const inner = (
    <React.Fragment>
      {iconLeft && <span className="ds-btn__icon">{iconLeft}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span className="ds-btn__icon">{iconRight}</span>}
    </React.Fragment>
  );

  if (as === 'a') {
    return (
      <a className={cls} href={href} aria-disabled={disabled || undefined} {...rest}>{inner}</a>
    );
  }
  return (
    <button className={cls} type={type} disabled={disabled} {...rest}>{inner}</button>
  );
}
