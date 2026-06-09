import * as React from 'react';

/** Hover / focus tooltip wrapping a trigger element. */
export interface TooltipProps {
  /** Tooltip text/content. */
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  /** The trigger element. */
  children?: React.ReactNode;
}

export function Tooltip(props: TooltipProps): JSX.Element;
