/* 360 — App UI kit · screens. Loaded after AppShell.jsx. Exports window.AppKit. */

const DS = window.Ds360GrowthDesignSystem_39b0a1;
const { Card, Button, IconButton, Badge, Tag, Avatar, AvatarGroup, ScoreRing, ProgressBar,
        Stat, Tabs, RatingScale, Textarea, Input, Select, Switch, Radio, Checkbox,
        Toast, ToastViewport, Logo, Dialog } = DS;
const Icon = window.Icon, Sidebar = window.Sidebar, Topbar = window.Topbar, Eyebrow = window.Eyebrow;

const PEOPLE = [
  { name: 'Ana Reed' }, { name: 'Jon Diaz' }, { name: 'Mia Lee' }, { name: 'Sam Roe' },
  { name: 'Ko Park' }, { name: 'Lena Fox' }, { name: 'Ravi Nair' }, { name: 'Tess Adler' }, { name: 'Will Yu' },
];

/* ============================ DASHBOARD ============================ */
function Dashboard({ onNav }) {
  const reviews = [
    { id: 1, name: 'My leadership 360', status: 'complete', score: 4.6, resp: 9, total: 9, when: 'Completed 2 days ago' },
    { id: 2, name: 'Q2 self-awareness check', status: 'active', score: null, resp: 7, total: 10, when: 'Closes in 4 days' },
    { id: 3, name: 'Client — Dana (CEO, Northwind)', status: 'active', score: null, resp: 3, total: 8, when: 'Closes in 9 days' },
  ];
  return (
    <div>
      <Topbar title="Dashboard" subtitle="Your active and completed 360s, all in one place."
        actions={<Button iconLeft={<Icon name="plus" size={18} />} onClick={() => onNav('launch')}>Launch a 360</Button>} />
      <div style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <Card padded><Stat label="Active 360s" value={2} delta="2 closing soon" deltaDir="flat" /></Card>
          <Card padded><Stat label="Avg overall score" value="4.6" unit="/5" delta="+0.4" deltaDir="up" /></Card>
          <Card padded><Stat label="Respondents this month" value={19} delta={6} /></Card>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Your 360s</h2>
            <button onClick={() => onNav('my360s')} style={{ background: 'none', border: 0, color: 'var(--text-brand)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => {
              const done = r.status === 'complete';
              return (
                <Card key={r.id} padded interactive onClick={() => done && onNav('guideReport')}
                  style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {done
                    ? <ScoreRing value={r.score} max={5} size={68} thickness={7} caption="" />
                    : <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}><Icon name="clock" size={24} /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
                      {done ? <Badge tone="success" dot>Complete</Badge> : <Badge tone="warning" dot>Collecting</Badge>}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '4px 0 10px' }}>{r.when}</div>
                    <div style={{ maxWidth: 320 }}>
                      <ProgressBar value={r.resp} max={r.total} tone={done ? 'success' : 'brand'} showValue format={(v, m) => `${v}/${m} responses`} />
                    </div>
                  </div>
                  <AvatarGroup people={PEOPLE.slice(0, r.resp)} max={4} size="sm" />
                  {done
                    ? <Button variant="subtle" iconRight={<Icon name="arrow-right" size={16} />} onClick={(e) => { e.stopPropagation(); onNav('guideReport'); }}>View guide</Button>
                    : <Button variant="secondary" onClick={(e) => { e.stopPropagation(); onNav('survey'); }}>Preview survey</Button>}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ LAUNCH ============================ */
function Launch({ onNav, onLaunch }) {
  const [recipients, setRecipients] = React.useState(['ana@northwind.com', 'jon@northwind.com', 'mia@acme.co']);
  const [draft, setDraft] = React.useState('');
  const [anon, setAnon] = React.useState(true);
  const [tmpl, setTmpl] = React.useState('leadership');
  const add = () => { const v = draft.trim(); if (v && !recipients.includes(v)) setRecipients([...recipients, v]); setDraft(''); };
  const templates = [
    ['leadership', 'Leadership 360', '18 questions across 6 competencies'],
    ['manager', 'New manager', '12 questions on team & delegation'],
    ['custom', 'Start from scratch', 'Build your own question set'],
  ];
  return (
    <div>
      <Topbar title="Launch a 360"
        subtitle="Set it up in minutes — we handle collection and synthesis."
        actions={<Button variant="ghost" iconLeft={<Icon name="arrow-left" size={16} />} onClick={() => onNav('dashboard')}>Cancel</Button>} />
      <div style={{ padding: 36, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Eyebrow>Step 1 · Basics</Eyebrow>
            <Input label="What are we reviewing?" placeholder="e.g. Dana's leadership 360" defaultValue="Dana — CEO, Northwind" />
            <Select label="Who is this for?" defaultValue="client"
              options={[{ value: 'me', label: 'Myself' }, { value: 'client', label: 'A coaching client' }, { value: 'teammate', label: 'A team member' }]} />
          </Card>

          <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Eyebrow>Step 2 · Question set</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map(([id, t, d]) => (
                <Radio key={id} name="tmpl" card label={t} description={d} checked={tmpl === id} onChange={() => setTmpl(id)} />
              ))}
            </div>
          </Card>

          <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow>Step 3 · Respondents</Eyebrow>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input label="Invite by email" placeholder="name@company.com" value={draft}
                  iconLeft={<Icon name="mail" size={16} />}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
              </div>
              <Button variant="secondary" onClick={add}>Add</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {recipients.map((r) => <Tag key={r} onRemove={() => setRecipients(recipients.filter((x) => x !== r))}>{r}</Tag>)}
            </div>
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
              <Switch label="Keep all responses anonymous" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            </div>
          </Card>
        </div>

        {/* summary */}
        <Card padded elevation="md" style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Ready to launch</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['file-text', `${templates.find((t) => t[0] === tmpl)[1]} template`],
              ['users', `${recipients.length} respondents invited`],
              [anon ? 'lock' : 'eye', anon ? 'Anonymous responses' : 'Named responses'],
              ['sparkles', 'AI Growth Guide on close']].map(([ic, tx]) => (
              <div key={tx} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--brand)' }}><Icon name={ic} size={18} /></span>{tx}
              </div>
            ))}
          </div>
          <Button fullWidth iconRight={<Icon name="arrow-right" size={17} />} onClick={onLaunch}>Launch 360</Button>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            Invitations send immediately. You can add respondents later.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ============================ SURVEY (respondent) ============================ */
function Survey({ onExit }) {
  const QS = [
    { t: 'They communicate a clear and compelling vision.', min: 'Rarely', max: 'Consistently' },
    { t: 'They give candid, timely feedback.', min: 'Rarely', max: 'Consistently' },
    { t: 'They create an environment where people feel safe to speak up.', min: 'Rarely', max: 'Consistently' },
  ];
  const [i, setI] = React.useState(0);
  const [vals, setVals] = React.useState({});
  const [note, setNote] = React.useState('');
  const q = QS[i];
  const last = i === QS.length - 1;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 64, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, background: 'var(--surface)' }}>
        <Logo size={26} />
        <Badge tone="brand" icon={<Icon name="lock" size={13} />}>Anonymous</Badge>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={onExit} style={{ background: 'none', border: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="x" size={16} />Exit preview
          </button>
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '56px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div style={{ marginBottom: 22 }}>
            <ProgressBar value={i + 1} max={QS.length} showValue label={`Question ${i + 1} of ${QS.length}`} format={(v, m) => `${Math.round((v / m) * 100)}%`} />
          </div>
          <div style={{ marginBottom: 10, fontSize: 14, color: 'var(--text-muted)' }}>You're giving feedback on <strong style={{ color: 'var(--text-secondary)' }}>Dana</strong>.</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, lineHeight: 1.2, letterSpacing: '-0.01em', margin: '0 0 28px', color: 'var(--text-primary)' }}>{q.t}</h2>
          <RatingScale value={vals[i]} onChange={(v) => setVals({ ...vals, [i]: v })} minLabel={q.min} maxLabel={q.max} allowNA />
          {last && (
            <div style={{ marginTop: 28 }}>
              <Textarea label="Anything you'd add? (optional)" placeholder="Share a specific example…" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <Button variant="ghost" disabled={i === 0} iconLeft={<Icon name="arrow-left" size={16} />} onClick={() => setI(Math.max(0, i - 1))}>Back</Button>
            {last
              ? <Button iconRight={<Icon name="check" size={17} />} onClick={onExit}>Submit feedback</Button>
              : <Button iconRight={<Icon name="arrow-right" size={16} />} onClick={() => setI(i + 1)}>Next</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ GROWTH GUIDE REPORT ============================ */
function GuideReport({ onNav }) {
  const [tab, setTab] = React.useState('overview');
  const dims = [['Communication', 4.8], ['Vision & strategy', 4.5], ['Builds trust', 4.7], ['Delegation', 3.6], ['Decisiveness', 4.2], ['Develops others', 3.9]];
  const recs = [
    ['book-open', 'Multipliers', 'Liz Wiseman', 'On getting more from your team by leading lighter.'],
    ['users', 'The Making of a Manager', 'Julie Zhuo', 'Practical delegation and feedback habits.'],
    ['compass', 'Coaching for Performance', 'John Whitmore', 'A framework for raising ownership.'],
  ];
  return (
    <div>
      <Topbar title="Growth Guide" subtitle="Dana — Leadership 360 · 9 respondents"
        actions={<>
          <Button variant="ghost" iconLeft={<Icon name="share-2" size={16} />}>Share</Button>
          <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Export PDF</Button>
        </>} />
      <div style={{ padding: '20px 36px 0' }}>
        <Tabs value={tab} onChange={setTab} items={[
          { value: 'overview', label: 'Overview' },
          { value: 'feedback', label: 'Feedback', count: 9 },
          { value: 'recs', label: 'Recommendations' },
        ]} />
      </div>

      <div style={{ padding: 36, paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {tab === 'overview' && (
          <React.Fragment>
            <Card tone="dark" padded style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
              <ScoreRing value={4.6} max={5} size={132} caption="overall" inverse />
              <div style={{ flex: 1 }}>
                <Badge tone="gold">AI Growth Guide</Badge>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 28, lineHeight: 1.25, color: '#fff', margin: '12px 0 8px', maxWidth: '28ch' }}>
                  A trusted, visionary leader — ready to grow by letting go.
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: '60ch' }}>
                  Respondents consistently praise your clarity and the trust you build. The clearest growth edge: delegate ownership earlier and name hard things sooner.
                </p>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22 }}>
              <Card padded>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Competencies</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {dims.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 130, fontSize: 14, color: 'var(--text-secondary)' }}>{k}</div>
                      <div style={{ flex: 1 }}><ProgressBar value={v} max={5} tone={v >= 4.5 ? 'success' : v < 4 ? 'gold' : 'brand'} /></div>
                      <div style={{ width: 28, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--text-primary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card padded style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Your priorities</div>
                {[['Delegate earlier', 'Your team is ready for more ownership than you give.'],
                  ['Name the hard things', 'Move tension into the open, sooner.'],
                  ['Protect deep work', 'Guard the time your best thinking needs.']].map(([t, b], idx) => (
                  <div key={t} style={{ display: 'flex', gap: 12, paddingTop: idx ? 13 : 0, borderTop: idx ? '1px solid var(--divider)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: 13, marginTop: 1 }}>0{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>{t}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{b}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
              <Card padded>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: 'var(--success-600)' }}><Icon name="trending-up" size={18} /></span>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Strengths</div>
                </div>
                {['Communicates a clear, compelling vision', 'Builds genuine trust across the team', 'Stays calm and steady under pressure'].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--success-600)', marginTop: 1 }}><Icon name="check" size={16} /></span>{s}
                  </div>
                ))}
              </Card>
              <Card padded>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: 'var(--gold-600)' }}><Icon name="target" size={18} /></span>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Blind spots</div>
                </div>
                {['Holds decisions too long when consensus is unclear', 'Takes on work the team is ready to own', 'Avoids naming interpersonal tension'].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--gold-600)', marginTop: 1 }}><Icon name="dot" size={16} /></span>{s}
                  </div>
                ))}
              </Card>
            </div>
          </React.Fragment>
        )}

        {tab === 'feedback' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Peer', 'They set the clearest vision I\u2019ve worked under. I always know why we\u2019re doing the work.'],
              ['Direct report', 'I wish they\u2019d hand off more. I\u2019m ready for bigger ownership and they tend to hold on.'],
              ['Peer', 'Unflappable in a crisis. The calm is contagious and it makes the whole team steadier.'],
              ['Direct report', 'When there\u2019s tension on the team, it can sit unaddressed longer than it should.'],
              ['Manager', 'Strong judgment. Decisions occasionally stall waiting for consensus that isn\u2019t coming.'],
              ['Peer', 'Deeply trusted. People bring them the real problems, not the polished version.']].map(([who, quote], idx) => (
              <Card key={idx} padded style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Badge tone="outline">{who}</Badge>
                  <span style={{ color: 'var(--teal-300)' }}><Icon name="quote" size={18} /></span>
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>{quote}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === 'recs' && (
          <React.Fragment>
            <div style={{ maxWidth: 620 }}>
              <Eyebrow>Curated for your profile</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 26, lineHeight: 1.2, margin: '10px 0 0' }}>
                Books, teachers and resources to grow your edge.
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
              {recs.map(([ic, title, who, why]) => (
                <Card key={title} padded interactive style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--gold-100)', color: 'var(--gold-600)', display: 'grid', placeItems: 'center' }}><Icon name={ic} size={22} /></span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{who}</div>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{why}</p>
                </Card>
              ))}
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

/* ============================ EMPTY (placeholder routes) ============================ */
function ComingSoon({ title }) {
  return (
    <div>
      <Topbar title={title} />
      <div style={{ padding: 36 }}>
        <Card padded style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-flex', marginBottom: 12, color: 'var(--neutral-400)' }}><Icon name="hammer" size={28} /></div>
          <p style={{ margin: 0, fontSize: 15 }}>This area isn't part of the kit yet.</p>
        </Card>
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
function AppKit() {
  const [view, setView] = React.useState('dashboard');
  const [toast, setToast] = React.useState(null);
  const onNav = (v) => setView(v);
  const onLaunch = () => { setView('dashboard'); setToast({ tone: 'success', title: '360 launched', body: 'Invitations sent to your respondents.' }); setTimeout(() => setToast(null), 4200); };

  if (view === 'survey') return <Survey onExit={() => setView('dashboard')} />;

  let screen;
  if (view === 'dashboard' || view === 'my360s') screen = <Dashboard onNav={onNav} />;
  else if (view === 'launch') screen = <Launch onNav={onNav} onLaunch={onLaunch} />;
  else if (view === 'guideReport' || view === 'guide') screen = <GuideReport onNav={onNav} />;
  else screen = <ComingSoon title={view === 'templates' ? 'Templates' : 'Settings'} />;

  return (
    <div style={{ display: 'flex', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Sidebar view={view} onNav={onNav} />
      <main style={{ flex: 1, minWidth: 0 }}>{screen}</main>
      {toast && <ToastViewport><Toast tone={toast.tone} title={toast.title} onClose={() => setToast(null)}>{toast.body}</Toast></ToastViewport>}
    </div>
  );
}
window.AppKit = AppKit;
