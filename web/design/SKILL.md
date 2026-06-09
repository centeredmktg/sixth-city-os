---
name: 360-design
description: Use this skill to generate well-branded interfaces and assets for 360 (get360growth.com — the AI-enabled 360° feedback platform), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. If working on production code, you can copy
assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or
design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Map
- `readme.md` — the full design guide: company context, voice & tone, visual foundations,
  iconography, and a file index. **Start here.**
- `styles.css` — the single global entry point; link it to inherit all tokens + fonts.
- `tokens/` — colors, typography, spacing/radii/shadows/motion as CSS custom properties.
- `assets/` — the 360° ring brand mark + iconography notes (icons via Lucide CDN).
- `components/` — React UI primitives (forms, display, navigation, feedback, brand). Each has
  a `.jsx`, a `.d.ts` props contract, a `.prompt.md` usage note, and a `@dsCard` HTML demo.
- `ui_kits/marketing/` and `ui_kits/app/` — full, interactive product recreations to copy from.

## Quick start (HTML artifact)
1. `<link rel="stylesheet" href="styles.css">` to load tokens + fonts.
2. Load `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js">` for icons.
3. Use the CSS variables (`var(--brand)`, `var(--font-serif)`, `var(--shadow-md)`, …) and lift
   patterns from the UI kits. For React, load the compiled bundle and read components from the
   `window.<Namespace>` global (see any `.card.html` for the exact namespace + load order).

## Non-negotiables
- Deep teal (`--teal-600`) identity with the dimensional brand gradient; warm taupe neutrals.
- Serif (`--font-serif`, Newsreader) for editorial headlines & quotes; sans (Hanken Grotesk)
  for everything else; mono for eyebrows/scores.
- Calm, premium, human voice. Sentence case. No emoji, no hype. The 360° ring is the motif.
