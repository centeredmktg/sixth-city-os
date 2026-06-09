import * as React from 'react';

/** Small status or category label. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'gold' | 'outline' | 'solid';
  /** Show a leading status dot. */
  dot?: boolean;
  /** Optional leading icon node. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
