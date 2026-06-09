import React from 'react';

const CSS = `
.ds-avatar{
  --_s:40px; width:var(--_s); height:var(--_s); flex:none; border-radius:50%;
  display:inline-flex; align-items:center; justify-content:center; overflow:hidden;
  font-family:var(--font-sans); font-weight:600; color:#fff; background:var(--gradient-brand);
  font-size:calc(var(--_s) * 0.4); letter-spacing:0.01em; user-select:none; position:relative; }
.ds-avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.ds-avatar--xs{ --_s:24px; }
.ds-avatar--sm{ --_s:32px; }
.ds-avatar--lg{ --_s:56px; }
.ds-avatar--xl{ --_s:80px; }
.ds-avatar--ring{ box-shadow:0 0 0 2px var(--surface), 0 0 0 4px var(--teal-300); }
.ds-avatar--muted{ background:var(--neutral-300); color:var(--neutral-700); }
.ds-avatar-group{ display:inline-flex; }
.ds-avatar-group .ds-avatar{ box-shadow:0 0 0 2px var(--surface); margin-left:-10px; }
.ds-avatar-group .ds-avatar:first-child{ margin-left:0; }
.ds-avatar-group__more{ display:inline-flex; align-items:center; justify-content:center;
  border-radius:50%; background:var(--neutral-100); color:var(--text-secondary);
  font-family:var(--font-sans); font-weight:600; box-shadow:0 0 0 2px var(--surface); margin-left:-10px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-avatar-css')) {
  const s = document.createElement('style'); s.id = 'ds-avatar-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/** User avatar — image or initials. */
export function Avatar({ name = '', src, size = 'md', ring = false, muted = false, className = '', ...rest }) {
  const cls = ['ds-avatar', size !== 'md' && `ds-avatar--${size}`, ring && 'ds-avatar--ring',
    muted && 'ds-avatar--muted', className].filter(Boolean).join(' ');
  return (
    <span className={cls} title={name || undefined} {...rest}>
      {src ? <img src={src} alt={name} /> : initials(name)}
    </span>
  );
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

/** Overlapping stack of avatars with a "+N" overflow. */
export function AvatarGroup({ people = [], max = 4, size = 'md' }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const px = SIZES[size] || 40;
  return (
    <span className="ds-avatar-group">
      {shown.map((p, i) => <Avatar key={i} name={p.name} src={p.src} size={size} />)}
      {extra > 0 && (
        <span className="ds-avatar-group__more"
          style={{ width: px, height: px, fontSize: px * 0.36 }}>+{extra}</span>
      )}
    </span>
  );
}
