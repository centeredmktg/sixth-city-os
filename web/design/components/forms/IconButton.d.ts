import * as React from 'react';

/** Icon-only square button. Requires an accessible `label`. */
export interface IconButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'subtle' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label (sets aria-label + title). */
  label: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
