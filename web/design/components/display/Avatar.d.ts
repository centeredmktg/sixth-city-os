import * as React from 'react';

/** User avatar — shows an image, or initials derived from `name`. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Used for initials + alt/title. */
  name?: string;
  /** Image URL; falls back to initials if absent. */
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Teal focus ring. */
  ring?: boolean;
  /** Neutral gray instead of brand gradient. */
  muted?: boolean;
}

export function Avatar(props: AvatarProps): JSX.Element;

export interface AvatarGroupProps {
  people: Array<{ name?: string; src?: string }>;
  /** Max shown before "+N". Default 4. */
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarGroup(props: AvatarGroupProps): JSX.Element;
