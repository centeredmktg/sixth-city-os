import * as React from 'react';

/**
 * Button — the primary action control.
 * @startingPoint section="Forms" subtitle="Primary / secondary / subtle / ghost / danger buttons" viewport="700x180"
 */
export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual style. Default "primary". "inverse" is for dark/teal backgrounds. */
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger' | 'inverse';
  /** Default "md". */
  size?: 'sm' | 'md' | 'lg';
  /** Icon node rendered before the label (e.g. a Lucide <svg>). */
  iconLeft?: React.ReactNode;
  /** Icon node rendered after the label. */
  iconRight?: React.ReactNode;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Render as <a> instead of <button>. */
  as?: 'button' | 'a';
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
