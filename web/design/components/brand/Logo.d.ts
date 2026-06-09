import * as React from 'react';

/**
 * The 360 brand lockup — the "36" wordmark plus the signature degree-ring "0".
 * @startingPoint section="Brand" subtitle="360 logo lockup — full, icon, inverse" viewport="400x160"
 */
export interface LogoProps {
  /** full = "360" lockup, icon = ring mark only. Default "full". */
  variant?: 'full' | 'icon';
  /** brand = teal gradient, dark = near-black, inverse = white (for dark backgrounds). Default "brand". */
  tone?: 'brand' | 'dark' | 'inverse';
  /** Font-size in px that drives the whole lockup's scale. Default 28. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Logo(props: LogoProps): JSX.Element;
