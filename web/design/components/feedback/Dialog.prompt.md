Modal dialog — confirmations, invite flows, focused tasks.

```jsx
const [open, setOpen] = React.useState(false);
<Dialog open={open} onClose={()=>setOpen(false)}
  title="Close this 360?"
  description="Respondents won't be able to submit after this."
  footer={<>
    <Button variant="secondary" onClick={()=>setOpen(false)}>Keep open</Button>
    <Button variant="danger" onClick={()=>setOpen(false)}>Close 360</Button>
  </>}>
  <p>You've collected 7 of 10 responses so far.</p>
</Dialog>
```

Props: `open`, `onClose`, `title`, `description`, `size`, `footer`. Closes on Esc / scrim click.
