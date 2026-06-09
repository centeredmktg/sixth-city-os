import * as React from 'react';

/** Modal dialog with scrim + backdrop blur. Render conditionally on `open`. */
export interface DialogProps {
  open: boolean;
  /** Called on Esc, scrim click, or close button. */
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Footer node — typically right-aligned Buttons. */
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function Dialog(props: DialogProps): JSX.Element | null;
