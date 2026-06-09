# 360 — Design System

> Get honest 360° feedback that actually helps you grow as a leader.

This is the design system for **360** (get360growth.com) — an AI-enabled 360° feedback
platform. It contains the brand's color, type, spacing, motion and shadow foundations,
reusable React UI primitives, and high-fidelity UI-kit recreations of the product and
marketing surfaces. Use it to design new screens, marketing pages, decks and prototypes
that look and feel unmistakably like 360.

---

## 1. Company & product context

**360** makes candid, structured feedback accessible to anyone serious about growth — not
just executives with large coaching budgets. A traditional 360 review (collecting
anonymous feedback from peers, reports and collaborators about someone's strengths, blind
spots and growth areas) historically took hours, cost thousands of dollars, and lived
buried inside enterprise HR suites. 360 collapses that into minutes with AI, then goes a
step further: every customer receives a personalized **Growth Guide** that translates raw
feedback into clear priorities, concrete behavior shifts, and curated recommendations
(books, teachers, resources, experiences).

- **Founded** 2025 by **Andrew Horn** (executive/leadership coach) and **Michael Galpert**
  (founder of Aviary, acquired by Adobe).
- **The deliverable** is the *Growth Guide* — insight operationalized into action. The
  product mantra: *"We don't just show you your data. We help you move."*
- **The three problems 360 solves** (their own framing): the old process is
  **Inaccessible** (locked in enterprise HR tools), **Inefficient** (feedback scattered
  across email/forms/docs), and **Incomplete** (insight without a plan rarely sticks).

### Who it's for
Two primary audiences, weighted roughly equally:
- **Coaches** — running structured 360s for their CEO/founder clients without manual busywork.
- **Small & mid-market companies** — teams that want 360 reviews as a foundational talent-
  development ritual but have no enterprise HR platform (and don't want one).

### Surfaces represented in this system
- **Marketing website** — premium, editorial, conversion-focused (homepage, about, pricing).
- **App** — dashboard of your 360s, the launch/setup flow, the respondent survey, and the
  AI **Growth Guide** report.

### Sources used to build this system
- Live site: `https://www.get360growth.com/` (homepage, `/about`). Copy, positioning and
  brand voice were lifted from these pages.
- Brand mark observed from `https://www.get360growth.com/logo-360-brand.svg` (full-color),
  `/logo-360-white.svg` (reversed). **No codebase or Figma file was provided**, and the
  official logo/font files were not supplied — see *Caveats* at the bottom.

---

## 2. Content fundamentals (voice & tone)

**Vibe:** calm, premium, and deeply human. 360 sounds like a wise coach, not a SaaS
dashboard. It is confident and direct about hard things (blind spots, candor) but always
warm and growth-oriented. Aspirational without being fluffy.

**Person & address.** Speaks to the reader as **"you"** and about the company as **"we."**
Direct and personal: *"We help you move."* / *"face their blind spots."* Never corporate
third-person ("users", "clients") in marketing voice.

**Casing.** Sentence case nearly everywhere — headlines, buttons, nav. Title Case reserved
for proper product nouns: **Growth Guide**, **360**. No ALL-CAPS shouting; uppercase is a
*typographic* device for tiny eyebrows/overlines only (tracked-out, mono), never for
sentences.

**Sentence rhythm.** Short, declarative, often fragments for cadence:
*"That experiment turned into a mission."* / *"With proof in hand… they decided to go all
in."* Big editorial headlines wrap across 2–3 lines and use a serif for gravity:
*"Building a world where candid feedback fuels growth."*

**Numbers & structure.** Loves the rule-of-three and parallel structure (Inaccessible /
Inefficient / Incomplete). Steps and stories are numbered (`01`, `02`, `03`). The glyph
**360°** is used as a motif and section marker.

**What to avoid.** No hype-y exclamation, no emoji, no jargon ("synergy", "leverage" as a
verb, "leverage AI"), no fear-based pressure. AI is framed as a quiet enabler of depth and
speed, never the hero of the sentence.

**Example phrases (real, on-brand):**
- "Get honest 360° feedback that actually helps you grow as a leader."
- "Candid feedback is one of the fastest paths to meaningful growth."
- "Insight without operationalization rarely leads to lasting change."
- "Launch a 360 in minutes." / "Start Your 360"
- "Where growth is not accidental, but intentional."

---

## 3. Visual foundations

**Overall feel.** Premium-editorial meets calm modern product. Generous whitespace, a warm
paper background, a deep evergreen identity, and serif headlines for emotional moments.
Restrained, never busy. The opposite of a dense enterprise HR dashboard — and that's the point.

**Color.** The identity is **deep teal / forest green** (`--teal-600 #236054` primary, down
to near-black `--teal-950`). It carries a signature **dimensional gradient** that runs from
a lighter teal to a deep forest green (`--gradient-brand`) — seen in the logo's "0" ring and
used for hero panels, the score ring, and key CTAs. Neutrals are **warm taupe** (`--neutral-*`),
not cool gray — this is what gives the paper its premium warmth. Dark sections are a warm
near-black (`--neutral-950 #0e0d0b`). A single **warm gold** accent (`--gold-500`) appears
sparingly for ratings, "recommended" badges and editorial highlights — never as a primary CTA.

**Typography.** Two families do the work:
- **Hanken Grotesk** (geometric-humanist sans) — all UI, body, and most headings. Chosen to
  echo the rounded-geometric "360" wordmark.
- **Newsreader** (literary serif) — editorial display, hero headlines and pull quotes. This
  is where the brand gets its soul.
- **Geist Mono** — small tracked-out eyebrows/overlines, scores and data labels.
Display headlines are tight-tracked (`--tracking-tight`), large, and often serif. Body is
set at 16–17px with relaxed leading for reading comfort.

**Spacing & layout.** 4px base scale. Airy: section padding is large (`--space-20`/`24`),
content sits in centered containers (`--container-lg/xl`) with a fluid `--gutter`. Layouts
favor a clear single column of editorial content or a calm 2-up split (text / visual). The
app uses a fixed `--sidebar-width: 264px` left nav.

**Backgrounds.** Mostly flat warm paper (`--bg-page`) and white surfaces. Hero / feature
moments use the brand gradient (`--gradient-brand`) or a near-black panel (`--gradient-dark`)
for contrast and drama. No noisy textures, no photographic full-bleed by default, no busy
patterns. The recurring decorative motif is the **circle/ring** (360°): concentric rings,
arc progress, the score donut.

**Corners & cards.** Soft but not bubbly. Cards use `--radius-lg (16px)` to `--radius-xl
(22px)`; pills/badges use `--radius-full`; inputs/buttons `--radius-md (12px)`. A card is a
white surface, a hairline `--border` (warm taupe), and a soft low-contrast shadow
(`--shadow-md`) — borders and shadow are subtle, never heavy. Premium = quiet elevation.

**Shadows.** Warm-tinted, soft, low-opacity (`--shadow-xs → --shadow-xl`). Elevation is
communicated with blur and spread, not darkness. CTAs on the brand color get a tinted
`--shadow-brand`.

**Borders.** Hairline 1px in warm taupe (`--border`), `--border-strong` for emphasis. Focus
states use a 3px teal ring (`--focus-ring`), never a hard outline.

**Motion.** Calm and confident. Default `--duration-base (220ms)` with `--ease-out` for
entrances and hovers; `--ease-soft` for larger transitions. Fades and gentle rises (6–12px),
no bounces, no spring overshoot, no infinite loops on content. Score rings and progress arcs
animate by sweeping the arc on first view.

**Interaction states.**
- *Hover:* primary buttons darken one step (`--brand → --brand-hover`); subtle/ghost
  controls gain a faint teal tint (`--brand-subtle`); cards lift from `--shadow-sm` to
  `--shadow-md`.
- *Active/press:* darken another step (`--brand-active`) and a ~1px nudge down / 0.99 scale.
- *Focus:* `--focus-ring` teal glow.
- *Disabled:* reduced opacity (~0.5), no shadow, `cursor: not-allowed`.

**Transparency & blur.** Used lightly — sticky headers and dialog scrims use a translucent
surface with a soft backdrop blur; overlays use a warm near-black scrim at ~40–55% alpha.

**Imagery.** When photography is used, lean warm and natural (real people, candid, calm —
coaching/leadership context), never cold stock-blue. Default to the gradient/ring graphic
language over photos.

---

## 4. Iconography

See the **ICONOGRAPHY** notes in `assets/README.md`. In brief: 360 has no proprietary icon
font visible from the public site, so this system standardizes on **Lucide** (loaded from
CDN) — a calm, consistent line set (1.75px stroke, rounded joins) that matches the brand's
quiet, humanist feel. Emoji are **never** used. The one bespoke brand glyph is the **360°
degree-ring** (`assets/logo-360-icon.svg`), which doubles as the favicon/app mark and the
basis of the `ScoreRing` component. Unicode `°` is used in copy ("360°").

---

## 5. Index / manifest

- `styles.css` — global entry point; links all tokens + fonts. **Consumers link this file.**
- `tokens/`
  - `fonts.css` — webfont loading (Hanken Grotesk, Newsreader, Geist Mono)
  - `colors.css` — teal scale, warm neutrals, gold accent, semantic hues, gradients, aliases
  - `typography.css` — families, type scale, weights, leading, tracking
  - `spacing.css` — spacing scale, radii, borders, shadows, motion, layout
- `assets/` — brand mark (`logo-360-icon.svg`), iconography notes
- `components/` — reusable React primitives (forms, display, navigation, feedback, brand)
- `ui_kits/` — full-screen product & marketing recreations
- `guidelines/` — foundation specimen cards (Design System tab)
- `SKILL.md` — Agent-Skill manifest for use in Claude Code

> Component & UI-kit listings are appended at the bottom once authored.

### Components (`window.Ds360GrowthDesignSystem_39b0a1`)
- **Brand** — `Logo` (full / icon / inverse).
- **Forms** (`components/forms/`) — `Button`, `IconButton`, `Input`, `Textarea`, `Select`,
  `Checkbox`, `Radio`, `Switch`, `RatingScale` (the 360 survey input).
- **Display** (`components/display/`) — `Card` (default/dark/brand), `Badge`, `Tag`, `Avatar`
  + `AvatarGroup`, `ScoreRing` (the 360° donut), `ProgressBar`, `Stat`.
- **Navigation** (`components/navigation/`) — `Tabs` (underline / pill).
- **Feedback** (`components/feedback/`) — `Dialog`, `Toast` + `ToastViewport`, `Tooltip`.

Each component directory holds `<Name>.jsx`, `<Name>.d.ts` (props), `<Name>.prompt.md`
(usage), and one `@dsCard` HTML demo. Starting points: `Logo`, `Button`, `RatingScale`,
`Card`, `ScoreRing`, plus the App-dashboard and Marketing-home screens.

### UI kits
- `ui_kits/marketing/` — interactive marketing site (home → pricing). See its `README.md`.
- `ui_kits/app/` — interactive product app: dashboard, launch flow, respondent survey, and the
  AI Growth Guide report. See its `README.md`.

### Foundation specimen cards
`guidelines/` holds the Design-System-tab cards for Colors, Type, Spacing and Brand.

---

## Caveats (please help me make this perfect)

- **No official logo/font files or codebase/Figma were available.** The "360" wordmark is
  reproduced as a CSS lockup and the ring mark as an SVG recreation — both approximations of
  the real mark. Fonts (**Hanken Grotesk + Newsreader**) are on-brand *substitutions* chosen
  to match the rounded-geometric wordmark and editorial tone; the real typefaces may differ.
- **UI kits are brand-faithful reconstructions**, not pixel copies — built from the public
  site's copy/positioning and the visual identity, since the actual app screens weren't
  accessible.
