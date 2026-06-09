Styled native select. Use for 1-of-N choices like role, relationship, or timeframe.

```jsx
<Select label="Relationship" placeholder="Choose one"
  options={[{value:'peer',label:'Peer'},{value:'report',label:'Direct report'},{value:'manager',label:'Manager'}]}
  value={rel} onChange={e=>setRel(e.target.value)} />
```

Props: `label`, `hint`, `options` (or `<option>` children), `placeholder`, plus native select attrs.
