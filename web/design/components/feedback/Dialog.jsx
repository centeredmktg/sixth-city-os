import React from 'react';

const CSS = `
.ds-dialog__scrim{ position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center;
  padding:24px; background:rgba(14,13,11,0.5); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  animation:ds-dialog-fade var(--duration-base) var(--ease-out); }
.ds-dialog{ position:relative; width:100%; max-width:480px; background:var(--surface);
  border-radius:var(--radius-xl); box-shadow:var(--shadow-xl); overflow:hidden;
  animation:ds-dialog-rise var(--duration-slow) var(--ease-out); max-height:calc(100vh - 48px);
  display:flex; flex-direction:column; }
.ds-dialog--sm{ max-width:380px; } .ds-dialog--lg{ max-width:640px; }
.ds-dialog__head{ display:flex; align-items:flex-start; gap:16px; padding:24px 24px 0; }
.ds-dialog__titles{ flex:1; }
.ds-dialog__title{ font-size:19px; font-weight:700; letter-spacing:var(--tracking-snug); margin:0; color:var(--text-primary); }
.ds-dialog__desc{ font-size:14px; color:var(--text-secondary); margin:6px 0 0; line-height:var(--leading-normal); }
.ds-dialog__x{ flex:none; display:inline-flex; padding:6px; margin:-6px -6px 0 0; border:0; background:transparent;
  color:var(--text-muted); border-radius:var(--radius-sm); cursor:pointer; }
.ds-dialog__x:hover{ background:var(--neutral-100); color:var(--text-primary); }
.ds-dialog__x svg{ width:18px; height:18px; }
.ds-dialog__body{ padding:18px 24px; overflow:auto; }
.ds-dialog__foot{ display:flex; justify-content:flex-end; gap:10px; padding:16px 24px 24px;
  border-top:1px solid var(--divider); margin-top:auto; }
@keyframes ds-dialog-fade{ from{ opacity:0 } to{ opacity:1 } }
@keyframes ds-dialog-rise{ from{ opacity:0; transform:translateY(12px) scale(0.98) } to{ opacity:1; transform:none } }
@media (prefers-reduced-motion: reduce){ .ds-dialog,.ds-dialog__scrim{ animation:none } }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-dialog-css')) {
  const s = document.createElement('style'); s.id = 'ds-dialog-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Modal dialog with scrim + blur. Render conditionally on `open`. */
export function Dialog({ open, onClose, title, description, size = 'md', footer, className = '', children }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ds-dialog__scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={['ds-dialog', size !== 'md' && `ds-dialog--${size}`, className].filter(Boolean).join(' ')}
        role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="ds-dialog__head">
            <div className="ds-dialog__titles">
              {title && <h2 className="ds-dialog__title">{title}</h2>}
              {description && <p className="ds-dialog__desc">{description}</p>}
            </div>
            {onClose && (
              <button className="ds-dialog__x" aria-label="Close" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        )}
        {children && <div className="ds-dialog__body">{children}</div>}
        {footer && <div className="ds-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
