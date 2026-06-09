import React from 'react';

const CSS = `
.ds-toast{ display:flex; align-items:flex-start; gap:12px; width:100%; max-width:380px;
  background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md);
  box-shadow:var(--shadow-lg); padding:14px 14px 14px 16px; font-family:var(--font-sans);
  border-left:3px solid var(--brand);
  animation:ds-toast-in var(--duration-slow) var(--ease-out); }
.ds-toast--success{ border-left-color:var(--success-600); }
.ds-toast--warning{ border-left-color:var(--warning-600); }
.ds-toast--danger{ border-left-color:var(--danger-600); }
.ds-toast__icon{ flex:none; display:inline-flex; margin-top:1px; color:var(--brand); }
.ds-toast--success .ds-toast__icon{ color:var(--success-600); }
.ds-toast--warning .ds-toast__icon{ color:var(--warning-600); }
.ds-toast--danger .ds-toast__icon{ color:var(--danger-600); }
.ds-toast__icon svg{ width:18px; height:18px; }
.ds-toast__body{ flex:1; min-width:0; }
.ds-toast__title{ font-size:14px; font-weight:600; color:var(--text-primary); }
.ds-toast__desc{ font-size:13px; color:var(--text-secondary); margin-top:2px; line-height:1.45; }
.ds-toast__x{ flex:none; border:0; background:transparent; color:var(--text-muted); cursor:pointer;
  padding:2px; border-radius:var(--radius-sm); margin:-2px -2px 0 0; }
.ds-toast__x:hover{ color:var(--text-primary); }
.ds-toast__x svg{ width:15px; height:15px; display:block; }
.ds-toast-viewport{ position:fixed; bottom:24px; right:24px; z-index:1100;
  display:flex; flex-direction:column; gap:10px; }
@keyframes ds-toast-in{ from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:none } }
@media (prefers-reduced-motion: reduce){ .ds-toast{ animation:none } }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-toast-css')) {
  const s = document.createElement('style'); s.id = 'ds-toast-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const ICONS = {
  default: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  success: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  warning: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  danger:  'M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
};

/** Notification toast. Position multiple inside ToastViewport. */
export function Toast({ tone = 'default', title, children, onClose, className = '' }) {
  return (
    <div className={['ds-toast', tone !== 'default' && `ds-toast--${tone}`, className].filter(Boolean).join(' ')} role="status">
      <span className="ds-toast__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[tone] || ICONS.default}/></svg>
      </span>
      <div className="ds-toast__body">
        {title && <div className="ds-toast__title">{title}</div>}
        {children && <div className="ds-toast__desc">{children}</div>}
      </div>
      {onClose && (
        <button className="ds-toast__x" aria-label="Dismiss" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}

/** Fixed bottom-right stack for toasts. */
export function ToastViewport({ children }) {
  return <div className="ds-toast-viewport">{children}</div>;
}
