Multi-line text input — feedback prompts, notes, open-ended survey answers.

```jsx
<Textarea label="What should they keep doing?" placeholder="Be specific…" maxLength={600} value={v} onChange={e=>setV(e.target.value)} />
```

Props: `label`, `hint`, `error`, `required`, `maxLength` (shows counter with controlled `value`), plus native textarea attrs.
