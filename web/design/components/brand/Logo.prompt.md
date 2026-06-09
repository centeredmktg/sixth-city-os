The 360 brand lockup — use anywhere the logo appears (headers, footers, auth, decks).

```jsx
<Logo size={32} />                      {/* full gradient wordmark */}
<Logo variant="icon" size={40} />        {/* ring mark only — favicons, avatars */}
<Logo tone="inverse" size={28} />        {/* white, for dark/teal backgrounds */}
```

Variants: `full` (wordmark + ring) and `icon` (ring only).
Tones: `brand` (teal gradient), `dark` (near-black), `inverse` (white).
`size` is the driving font-size in px; everything scales from it.
