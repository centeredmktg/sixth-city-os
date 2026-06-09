import * as React from 'react';

/**
 * Surface container — the building block for grouped content.
 * @startingPoint section="Display" subtitle="Card surfaces — default, dark, brand-gradient" viewport="700x260"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** "default" white, "dark" near-black gradient, "brand" teal gradient. */
  tone?: 'default' | 'dark' | 'brand';
  /** Apply built-in padding. Default true. */
  padded?: boolean;
  /** Resting shadow. Default "sm". */
  elevation?: 'none' | 'sm' | 'md';
  /** Adds hover lift + pointer. */
  interactive?: boolean;
  as?: any;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
