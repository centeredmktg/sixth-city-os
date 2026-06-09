Primary action control — use for CTAs, form submits and navigation actions.

```jsx
<Button>Start your 360</Button>
<Button variant="secondary">Save draft</Button>
<Button variant="subtle">Invite</Button>
<Button variant="ghost" iconRight={<ArrowRight/>}>Learn more</Button>
<Button variant="inverse">Start your 360</Button>   {/* on dark/teal */}
```

Variants: `primary` (teal CTA), `secondary` (outlined), `subtle` (teal tint), `ghost`, `danger`, `inverse` (white-on-dark).
Sizes: `sm` / `md` / `lg`. Props: `iconLeft`, `iconRight`, `fullWidth`, `as="a"` + `href`, `disabled`.
Use exactly one `primary` button per view region.
