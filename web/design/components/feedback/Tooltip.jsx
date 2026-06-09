import React from 'react';

const CSS = `
.ds-tip{ position:relative; display:inline-flex; }
.ds-tip__pop{ position:absolute; z-index:1200; pointer-events:none; white-space:nowrap;
  background:var(--neutral-900); color:#fff; font-family:var(--font-sans); font-size:12.5px; font-weight:500;
  padding:6px 10px; border-radius:var(--radius-sm); box-shadow:var(--shadow-md);
  opacity:0; transform:translateY(2px) scale(0.98); transform-origin:center;
  transition:opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.ds-tip__pop::after{ content:""; position:absolute; width:7px; height:7px; background:inherit; transform:rotate(45deg); }
.ds-tip:hover .ds-tip__pop, .ds-tip:focus-within .ds-tip__pop{ opacity:1; transform:translateY(0) scale(1); }
.ds-tip__pop--top{ bottom:calc(100% + 8px); left:50%; translate:-50% 0; }
.ds-tip__pop--top::after{ bottom:-3px; left:50%; margin-left:-3.5px; }
.ds-tip__pop--bottom{ top:calc(100% + 8px); left:50%; translate:-50% 0; }
.ds-tip__pop--bottom::after{ top:-3px; left:50%; margin-left:-3.5px; }
.ds-tip__pop--left{ right:calc(100% + 8px); top:50%; translate:0 -50%; }
.ds-tip__pop--left::after{ right:-3px; top:50%; margin-top:-3.5px; }
.ds-tip__pop--right{ left:calc(100% + 8px); top:50%; translate:0 -50%; }
.ds-tip__pop--right::after{ left:-3px; top:50%; margin-top:-3.5px; }
@media (prefers-reduced-motion: reduce){ .ds-tip__pop{ transition:opacity var(--duration-fast) linear; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('ds-tooltip-css')) {
  const s = document.createElement('style'); s.id = 'ds-tooltip-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Hover/focus tooltip wrapping a trigger element. */
export function Tooltip({ content, side = 'top', className = '', children }) {
  return (
    <span className={['ds-tip', className].filter(Boolean).join(' ')} tabIndex={0}>
      {children}
      <span className={`ds-tip__pop ds-tip__pop--${side}`} role="tooltip">{content}</span>
    </span>
  );
}
