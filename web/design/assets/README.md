# 360 — Brand assets

## Files
- `logo-360-icon.svg` — the **360° degree-ring** brand mark (gradient donut). Doubles as
  favicon / app icon and is the visual basis of the `ScoreRing` component. *Recreation —
  replace with the official mark when available.*

The full **"360" wordmark** is implemented as a CSS lockup in `components/brand/Logo.jsx`
(`<Logo/>`) using the rounded display font (`--font-brand`, Fredoka) for the "36" and the
ring mark for the "0". Use the component rather than a static wordmark image so it inherits
brand color/gradient correctly on light and dark backgrounds.

## ICONOGRAPHY

- **System: Lucide** (https://lucide.dev), loaded from CDN. 360 exposes no proprietary icon
  font on its public site, so this system standardizes on Lucide — a calm, consistent
  line-icon set whose ~1.75px stroke and rounded joins match the brand's quiet, humanist,
  premium feel. *(Substitution — flagged. If 360 has an internal icon set, drop the SVGs/font
  into this folder and update this note.)*
- **Style rules:** line (stroked) icons only, never filled/duotone. Stroke `1.75`, rounded
  linecap & linejoin. Size in steps of 16 / 20 / 24px. Color inherits `currentColor`
  (`--text-secondary` by default, `--brand` when active/selected). Pair an icon with a text
  label wherever space allows.
- **Bespoke glyph:** the **360° degree-ring** (`logo-360-icon.svg`) is the one custom mark —
  used for the logo "0", loading/score visuals, and section markers.
- **Emoji:** never. **Unicode:** the degree sign `°` is used in copy ("360°"); arrows
  (Lucide `arrow-right`) for CTAs.

### CDN usage
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="arrow-right"></i>
<script>lucide.createIcons();</script>
```
Common icons in this system: `arrow-right`, `arrow-up-right`, `check`, `chevron-down`,
`plus`, `users`, `user`, `mail`, `send`, `sparkles`, `target`, `compass`, `book-open`,
`message-circle`, `bar-chart-3`, `circle-check`, `lock`, `clock`, `settings`, `more-horizontal`.
