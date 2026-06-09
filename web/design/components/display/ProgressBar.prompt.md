Linear completion bar — survey response progress, profile completeness.

```jsx
<ProgressBar value={7} max={10} label="Responses collected" showValue
  format={(v,m)=>`${v}/${m}`} />
<ProgressBar value={82} tone="gold" />
```

Props: `value`, `max`, `label`, `showValue`, `tone` (brand/gold/success), `size`, `format`.
