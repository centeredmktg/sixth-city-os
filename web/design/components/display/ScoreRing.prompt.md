The brand's signature data viz — a 360° donut that sweeps to a score on mount.

```jsx
<ScoreRing value={4.6} max={5} caption="overall" label="Leadership" />
<ScoreRing value={82} max={100} format={v=>`${v}%`} tone="gold" size={96} />
<ScoreRing value={4.1} inverse />     {/* on dark panels */}
```

Props: `value`, `max`, `size`, `thickness`, `tone` (brand/gold/success), `inverse`, `label`, `caption`, `format`.
Use for overall scores, competency dimensions and survey completion.
