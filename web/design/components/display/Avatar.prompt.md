User avatar (image or initials) and an overlapping AvatarGroup.

```jsx
<Avatar name="Andrew Horn" />
<Avatar src="/me.jpg" name="Andrew Horn" size="lg" ring />
<AvatarGroup people={[{name:'Ana Reed'},{name:'Jon Diaz'},{name:'Mia Lee'},{name:'Sam Roe'},{name:'Ko Park'}]} max={3} />
```

Sizes: xs/sm/md/lg/xl. Initials come from `name`; brand gradient by default, `muted` for neutral.
