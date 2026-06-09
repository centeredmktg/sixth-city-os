# 360 — Marketing website UI kit

An interactive, brand-faithful recreation of the 360 marketing site, composed entirely from
the design-system primitives (`window.Ds360GrowthDesignSystem_39b0a1`).

## Run
Open `index.html`. It loads `styles.css` + the compiled DS bundle, then mounts
`MarketingSite` from `MarketingSite.jsx`.

## Screens / sections
- **Home** — sticky translucent header, serif hero with a live Growth-Guide preview card,
  "As seen in Inc." trust bar, **How it works** (3 numbered steps), the **Growth Guide**
  feature split (dark panel), the **three I's** problem section (Inaccessible / Inefficient /
  Incomplete), and a brand-gradient CTA.
- **Pricing** — three tiers (Individual / Coach / Team) with a "Most popular" highlight.
  Nav switches between Home and Pricing.

## Components used
`Logo`, `Button`, `Card` (default / dark / brand), `Badge`, `ScoreRing`, `AvatarGroup`,
plus Lucide icons. Section components live in `MarketingSite.jsx` (`SiteHeader`, `Hero`,
`GuidePreview`, `HowItWorks`, `GuideFeature`, `Problem`, `CTA`, `Pricing`, `SiteFooter`).

## Notes
- Copy is taken from get360growth.com (home + about pages).
- **Pricing figures are illustrative** — the public site did not expose pricing; replace with
  real numbers.
- The "Inc." trust mark is set in type as a placeholder; drop in the real `inc-magazine.svg`
  when available.
