/* 360 — App UI kit · shell (sidebar, topbar, shared helpers).
 * Composes window.Ds360GrowthDesignSystem_39b0a1. Loaded before AppScreens.jsx. */

const DS = window.Ds360GrowthDesignSystem_39b0a1;

/* ---- Icon (Lucide) ---- */
function Icon({ name, size = 20, stroke = 1.75, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const i = document.createElement('i'); i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({ attrs: { 'stroke-width': stroke, width: size, height: size } });
    }
  });
  return <span ref={ref} style={{ display: 'inline-flex', ...style }} />;
}
window.Icon = Icon;

/* ---- Sidebar ---- */
function Sidebar({ view, onNav }) {
  const { Logo, Avatar } = DS;
  const items = [
    ['dashboard', 'layout-dashboard', 'Dashboard'],
    ['my360s', 'circle-dot', 'My 360s'],
    ['guide', 'compass', 'Growth Guide'],
    ['templates', 'file-text', 'Templates'],
  ];
  const item = (id, icon, label, active) => (
    <button key={id} onClick={() => onNav(id)} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
      padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 0, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: active ? 600 : 500,
      color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
      background: active ? 'var(--brand-subtle)' : 'transparent' }}>
      <Icon name={icon} size={19} />{label}
    </button>
  );
  return (
    <aside style={{ width: 'var(--sidebar-width)', flex: 'none', background: 'var(--surface)',
      borderRight: '1px solid var(--border)', height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
      <div style={{ padding: '4px 8px 22px' }}><Logo size={28} /></div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(([id, icon, label]) => item(id, icon, label, view === id || (id === 'guide' && view === 'guideReport')))}
      </nav>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => onNav('settings')} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 0, cursor: 'pointer', background: 'transparent',
          fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
          <Icon name="settings" size={19} />Settings
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid var(--divider)' }}>
          <Avatar name="Andrew Horn" size="sm" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Andrew Horn</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Coach</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;

/* ---- Topbar ---- */
function Topbar({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      padding: '28px 36px 22px', borderBottom: '1px solid var(--border)' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', margin: '5px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
window.Topbar = Topbar;

/* shared section eyebrow */
function Eyebrow({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</div>;
}
window.Eyebrow = Eyebrow;
