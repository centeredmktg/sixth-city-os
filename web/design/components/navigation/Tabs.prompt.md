Tab navigation for switching views within a screen.

```jsx
const [tab, setTab] = React.useState('overview');
<Tabs value={tab} onChange={setTab} items={[
  {value:'overview', label:'Overview'},
  {value:'feedback', label:'Feedback', count:9},
  {value:'guide', label:'Growth Guide'},
]} />
```

Variants: `underline` (default, page-level) and `pill` (segmented, in-card). Items take `icon` and `count`.
