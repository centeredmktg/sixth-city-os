The signature 360 survey input — a segmented Likert rating with anchor labels.

```jsx
const [v, setV] = React.useState();
<RatingScale value={v} onChange={setV}
  minLabel="Rarely" maxLabel="Consistently" allowNA />
```

Props: `max` (default 5), `value`, `onChange(n)`, `minLabel`, `maxLabel`, `allowNA`.
Use one per survey statement; keep anchor labels short.
