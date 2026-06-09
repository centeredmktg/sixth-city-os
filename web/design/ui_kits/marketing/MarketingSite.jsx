/* 360 — Marketing site UI kit.
 * Composes the design-system primitives (window.Ds360GrowthDesignSystem_39b0a1).
 * Copy is lifted from get360growth.com (home + about). Pricing figures are illustrative. */

const DS = window.Ds360GrowthDesignSystem_39b0a1;
const { Logo, Button, Card, Badge, ScoreRing, Stat, Avatar, AvatarGroup } = DS;

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

const Eyebrow = ({ children, light }) => (
  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: light ? 'var(--teal-300)' : 'var(--text-brand)', marginBottom: 16 }}>
    {children}
  </div>
);

const Container = ({ children, style }) => (
  <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '0 40px', ...style }}>{children}</div>
);

/* ---- Header ---- */
function SiteHeader({ onNav, view }) {
  const link = (id, label) => (
    <button onClick={() => onNav(id)} style={{
      background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 15,
      fontWeight: 500, color: view === id ? 'var(--text-brand)' : 'var(--text-secondary)', padding: '6px 2px' }}>
      {label}
    </button>
  );
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(247,246,242,0.82)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
      <Container style={{ height: 72, display: 'flex', alignItems: 'center', gap: 32 }}>
        <button onClick={() => onNav('home')} style={{ background: 'none', border: 0, cursor: 'pointer', display: 'flex' }}>
          <Logo size={30} />
        </button>
        <nav style={{ display: 'flex', gap: 26, marginLeft: 8 }}>
          {link('home', 'How it works')}
          {link('pricing', 'Pricing')}
          {link('about', 'About')}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Sign in</button>
          <Button iconRight={<Icon name="arrow-right" size={16} />} onClick={() => onNav('pricing')}>Start your 360</Button>
        </div>
      </Container>
    </header>
  );
}
window.SiteHeader = SiteHeader;

/* ---- Growth Guide preview (hero + feature visual) ---- */
function GuidePreview() {
  return (
    <Card elevation="md" padded={false} style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ background: 'var(--gradient-dark)', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <ScoreRing value={4.6} max={5} caption="overall" size={104} inverse />
        <div>
          <Badge tone="gold">AI Growth Guide</Badge>
          <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, marginTop: 10, fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>
            Andrew's leadership 360
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>9 respondents · synthesized</div>
        </div>
      </div>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[['Communication', 4.8], ['Strategic clarity', 4.5], ['Delegation', 3.6]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{k}</div>
            <div style={{ flex: 2, height: 8, borderRadius: 999, background: 'var(--neutral-200)', overflow: 'hidden' }}>
              <div style={{ width: `${(v / 5) * 100}%`, height: '100%', background: 'var(--gradient-brand)', borderRadius: 999 }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', width: 26, textAlign: 'right' }}>{v}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--gold-600)', marginTop: 1 }}><Icon name="sparkles" size={16} /></span>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Priority:</strong> Delegate ownership earlier — your team is ready for more.
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---- Hero ---- */
function Hero({ onNav }) {
  return (
    <section style={{ background: 'var(--gradient-paper)' }}>
      <Container style={{ padding: '76px 40px 64px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
        <div>
          <Eyebrow>AI-enabled 360° feedback</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 56, lineHeight: 1.04,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Get honest 360° feedback that actually helps you grow.
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--text-secondary)', margin: '22px 0 30px', maxWidth: '46ch' }}>
            360 is the premier AI-enabled feedback tool, designed to make powerful, actionable insight accessible to anyone serious about growth.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Button size="lg" iconRight={<Icon name="arrow-right" size={18} />} onClick={() => onNav('pricing')}>Start your 360</Button>
            <Button size="lg" variant="secondary" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>See how it works</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}>
            <AvatarGroup people={[{name:'Ana Reed'},{name:'Jon Diaz'},{name:'Mia Lee'},{name:'Sam Roe'}]} max={4} size="sm" />
            <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Trusted by coaches &amp; founders at growth-stage companies.</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><GuidePreview /></div>
      </Container>
      <Container style={{ paddingBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, borderTop: '1px solid var(--border)', paddingTop: 26 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>As seen in</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 26, color: 'var(--neutral-700)', fontStyle: 'italic' }}>Inc.</span>
        </div>
      </Container>
    </section>
  );
}

/* ---- How it works ---- */
function HowItWorks() {
  const steps = [
    ['01', 'send', 'Launch in minutes', 'Set up your 360, choose your questions, and invite respondents in a few clicks. No HR platform required.'],
    ['02', 'message-circle', 'We collect & synthesize', 'We handle the logistics of gathering anonymous feedback and use AI to synthesize it — without sacrificing depth.'],
    ['03', 'compass', 'Get your Growth Guide', 'Receive clear priorities, practical behavior shifts, and curated books, teachers and resources for your profile.'],
  ];
  return (
    <section id="how" style={{ padding: '88px 0' }}>
      <Container>
        <div style={{ maxWidth: 640, marginBottom: 48 }}>
          <Eyebrow>How it works</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            Powerful feedback, without the busywork.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {steps.map(([n, icon, title, body]) => (
            <Card key={n} padded interactive style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand-subtle)', color: 'var(--text-brand)', display: 'grid', placeItems: 'center' }}>
                  <Icon name={icon} size={22} />
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>{n}</span>
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---- Growth Guide feature ---- */
function GuideFeature() {
  const points = [
    ['target', 'Targeted development areas', 'Know exactly where to focus, ranked by impact.'],
    ['compass', 'Practical behavior shifts', 'Specific, repeatable changes — not vague advice.'],
    ['book-open', 'Curated recommendations', 'Books, teachers and experiences matched to your profile.'],
  ];
  return (
    <section style={{ background: 'var(--surface-subtle)', padding: '88px 0' }}>
      <Container style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 56, alignItems: 'center' }}>
        <div>
          <Eyebrow>The Growth Guide</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 18px', color: 'var(--text-primary)' }}>
            We don't just show you your data. We help you move.
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 26px', maxWidth: '46ch' }}>
            Every customer receives a comprehensive, personalized Growth Guide that translates raw feedback into clear priorities and tangible next steps.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {points.map(([icon, t, b]) => (
              <div key={t} style={{ display: 'flex', gap: 14 }}>
                <span style={{ flex: 'none', color: 'var(--brand)', marginTop: 2 }}><Icon name={icon} size={22} /></span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{t}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Card tone="dark" padded style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal-300)' }}>Your priorities</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: '#fff', marginTop: 8 }}>Where to grow next</div>
            </div>
            <Badge tone="gold">3 focus areas</Badge>
          </div>
          {[['Delegate earlier', 'Your team is ready for more ownership.'],
            ['Name the hard things', 'Move tension into the open, sooner.'],
            ['Protect deep work', 'Guard the time your best thinking needs.']].map(([t, b], i) => (
            <div key={t} style={{ display: 'flex', gap: 14, paddingTop: i ? 16 : 0, borderTop: i ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-300)', fontSize: 13, marginTop: 2 }}>0{i + 1}</span>
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{t}</div>
                <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: 13.5, marginTop: 2 }}>{b}</div>
              </div>
            </div>
          ))}
        </Card>
      </Container>
    </section>
  );
}

/* ---- The problem (three I's) ---- */
function Problem() {
  const items = [
    ['lock', 'Inaccessible', 'Most 360 tools are buried inside large HR platforms — complex, expensive, and built for enterprises, not individuals or small teams.'],
    ['clock', 'Inefficient', 'Organizing a 360 manually is messy. Feedback comes through email, forms and scattered docs. Coordinating respondents takes forever.'],
    ['bar-chart-3', 'Incomplete', 'Even great feedback often leaves you unsure what to do next. Insight without operationalization rarely leads to lasting change.'],
  ];
  return (
    <section style={{ padding: '88px 0' }}>
      <Container>
        <div style={{ maxWidth: 640, marginBottom: 44 }}>
          <Eyebrow>The problem we saw</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            The traditional 360 is either too expensive, too complicated, or too incomplete.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {items.map(([icon, t, b]) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ color: 'var(--neutral-500)' }}><Icon name={icon} size={24} /></span>
              <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{b}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---- CTA ---- */
function CTA({ onNav }) {
  return (
    <section style={{ padding: '32px 0 96px' }}>
      <Container>
        <Card tone="brand" padded style={{ textAlign: 'center', padding: '64px 40px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Transform your leadership</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 44, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', margin: '0 auto 26px', maxWidth: '20ch' }}>
            Where growth is not accidental, but intentional.
          </h2>
          <Button size="lg" variant="inverse" iconRight={<Icon name="arrow-right" size={18} />} onClick={() => onNav('pricing')}>Start your 360</Button>
        </Card>
      </Container>
    </section>
  );
}

/* ---- Footer ---- */
function SiteFooter() {
  const col = (title, links) => (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((l) => <a key={l} href="#" onClick={(e)=>e.preventDefault()} style={{ fontSize: 14.5, color: 'var(--text-secondary)', textDecoration: 'none' }}>{l}</a>)}
      </div>
    </div>
  );
  return (
    <footer style={{ background: 'var(--bg-page-dark)', padding: '64px 0 40px' }}>
      <Container style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 40 }}>
        <div>
          <Logo size={30} tone="inverse" />
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, lineHeight: 1.55, margin: '18px 0 0', maxWidth: '32ch' }}>
            Get honest 360° feedback that actually helps you grow as a leader.
          </p>
        </div>
        {col('Company', ['About us', 'Careers', 'Contact'])}
        {col('Legal', ['Privacy Policy', 'Terms of Service'])}
      </Container>
      <Container style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>© 2026 360. All rights reserved.</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Built for growth.</span>
      </Container>
    </footer>
  );
}

/* ---- Pricing ---- */
function Pricing({ onNav }) {
  const tiers = [
    { name: 'Individual', price: '$149', unit: 'per 360', desc: 'One complete 360 with your full Growth Guide.', cta: 'Start your 360', featured: false,
      features: ['1 leadership 360', 'Up to 12 respondents', 'AI Growth Guide', 'Curated recommendations'] },
    { name: 'Coach', price: '$59', unit: 'per client / mo', desc: 'Run unlimited 360s across your client roster.', cta: 'Start coaching', featured: true,
      features: ['Unlimited 360s', 'Multi-client dashboard', 'White-glove templates', 'Growth Guide for every client', 'Priority support'] },
    { name: 'Team', price: 'Custom', unit: "let's talk", desc: 'Make 360s a foundational talent ritual.', cta: 'Talk to us', featured: false,
      features: ['Everything in Coach', 'Org-wide rollout', 'Shared question library', 'Aggregate insights', 'SSO & admin controls'] },
  ];
  return (
    <main>
      <section style={{ background: 'var(--gradient-paper)', padding: '72px 0 40px' }}>
        <Container style={{ textAlign: 'center' }}>
          <Eyebrow>Pricing</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 48, lineHeight: 1.06, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: '18ch', color: 'var(--text-primary)' }}>
            Candid feedback, finally within reach.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '20px auto 0', maxWidth: '52ch', lineHeight: 1.55 }}>
            Growth shouldn't be reserved for executives with large coaching budgets. Pick the plan that fits how you work.
          </p>
        </Container>
      </section>
      <section style={{ padding: '24px 0 88px' }}>
        <Container style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, alignItems: 'start' }}>
          {tiers.map((t) => (
            <Card key={t.name} padded elevation={t.featured ? 'md' : 'sm'}
              style={{ border: t.featured ? '1.5px solid var(--brand)' : undefined, position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, paddingTop: t.featured ? 28 : 22 }}>
              {t.featured && <div style={{ position: 'absolute', top: -12, left: 22 }}><Badge tone="gold">Most popular</Badge></div>}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 600, color: 'var(--text-primary)' }}>{t.price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.unit}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '10px 0 0', lineHeight: 1.5 }}>{t.desc}</p>
              </div>
              <Button variant={t.featured ? 'primary' : 'secondary'} fullWidth onClick={() => onNav('home')}>{t.cta}</Button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderTop: '1px solid var(--divider)', paddingTop: 18 }}>
                {t.features.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: 'var(--brand)', flex: 'none' }}><Icon name="check" size={17} /></span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </Container>
      </section>
    </main>
  );
}

/* ---- App ---- */
function MarketingSite() {
  const [view, setView] = React.useState('home');
  const onNav = (v) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <SiteHeader onNav={onNav} view={view} />
      {view === 'pricing'
        ? <Pricing onNav={onNav} />
        : (
          <main>
            <Hero onNav={onNav} />
            <HowItWorks />
            <GuideFeature />
            <Problem />
            <CTA onNav={onNav} />
          </main>
        )}
      <SiteFooter />
    </div>
  );
}
window.MarketingSite = MarketingSite;
