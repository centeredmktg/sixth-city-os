Labelled text input. Use for all single-line text entry.

```jsx
<Input label="Work email" type="email" placeholder="you@company.com" iconLeft={<Mail/>} />
<Input label="Full name" required hint="As you'd like it to appear" />
<Input label="Seats" error="Enter a number greater than 0" />
```

Props: `label`, `hint`, `error`, `required`, `iconLeft`, `iconRight`, plus all native input attrs.
Pair with `Textarea` for multi-line and `Select` for choices.
