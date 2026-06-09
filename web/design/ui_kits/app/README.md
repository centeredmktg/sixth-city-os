# 360 — App UI kit

An interactive, brand-faithful recreation of the 360 product app, composed from the
design-system primitives (`window.Ds360GrowthDesignSystem_39b0a1`).

## Run
Open `index.html`. It loads `styles.css` + the compiled DS bundle, then `AppShell.jsx`
(sidebar / topbar / Icon) and `AppScreens.jsx` (screens + the `AppKit` controller).

## Click-through
- **Dashboard** — stat cards, your active & completed 360s (score rings, progress, respondent
  avatars). "Launch a 360" → the launch flow; a completed 360 → its Growth Guide.
- **Launch a 360** — basics, question-set template (selectable Radio cards), respondent
  invites (removable Tags), anonymity toggle, and a sticky summary card. "Launch 360" returns
  to the dashboard with a success toast.
- **Respondent survey** — full-screen, anonymous, with the `RatingScale` input, progress, and
  an optional open-ended note. Reached via "Preview survey".
- **Growth Guide report** — the deliverable: overall `ScoreRing`, competency breakdown,
  AI-generated priorities, strengths vs blind spots, verbatim feedback, and curated
  recommendations. Tabbed (Overview / Feedback / Recommendations).

## Components used
`Logo`, `Button`, `IconButton`, `Badge`, `Tag`, `Avatar`/`AvatarGroup`, `Card`, `ScoreRing`,
`ProgressBar`, `Stat`, `Tabs`, `RatingScale`, `Input`, `Select`, `Textarea`, `Switch`,
`Radio`, `Toast`/`ToastViewport`, plus Lucide icons.

## Notes
- Names, scores, quotes and recommendations are realistic sample data, not real customers.
- The actual product screens weren't accessible; this is a faithful reconstruction from the
  brand identity and the product described on get360growth.com.
