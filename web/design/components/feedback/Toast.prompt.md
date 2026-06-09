Transient notification. Stack inside `ToastViewport` (fixed, bottom-right).

```jsx
<ToastViewport>
  <Toast tone="success" title="360 launched" onClose={dismiss}>
    Invites sent to 9 respondents.
  </Toast>
</ToastViewport>
```

Tones: default, success, warning, danger. `title` + description (children) + optional `onClose`.
