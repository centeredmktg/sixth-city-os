import React from 'react';

/**
 * 360 brand lockup. The "36" is set in the rounded display font; the "0" is the
 * signature degree-ring mark. Recreation of the official wordmark — see assets/README.md.
 */
export function Logo({ variant = 'full', tone = 'brand', size = 28, className = '', style = {} }) {
  const uid = React.useMemo(() => 'lg' + Math.random().toString(36).slice(2, 8), []);
  const isInverse = tone === 'inverse';
  const isDark = tone === 'dark';
  const solid = isInverse ? '#ffffff' : isDark ? '#0e0d0b' : null;

  const ringD = 'M50 3a47 47 0 1 0 0.01 0Z M50 29a21 21 0 1 1 -0.01 0Z';
  const ring = (
    <svg viewBox="0 0 100 100" aria-hidden="true"
         style={{ height: '0.84em', width: '0.84em', display: 'block', marginLeft: '0.02em' }}>
      {!solid && (
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a9082" />
            <stop offset="48%" stopColor="#236054" />
            <stop offset="100%" stopColor="#0e2d27" />
          </linearGradient>
        </defs>
      )}
      <path d={ringD} fillRule="evenodd" fill={solid || `url(#${uid})`} />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <span className={className} aria-label="360"
            style={{ display: 'inline-flex', fontSize: size, lineHeight: 1, ...style }}>
        {ring}
      </span>
    );
  }

  const digitsStyle = {
    fontFamily: 'var(--font-brand)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    ...(solid
      ? { color: solid }
      : {
          background: 'var(--gradient-brand)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }),
  };

  return (
    <span className={className} aria-label="360"
          style={{ display: 'inline-flex', alignItems: 'center', fontSize: size, lineHeight: 1, ...style }}>
      <span style={digitsStyle}>36</span>
      {ring}
    </span>
  );
}
