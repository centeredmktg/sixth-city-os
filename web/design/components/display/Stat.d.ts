import * as React from 'react';

/** Compact metric — label, large value, optional trend delta. */
export interface StatProps {
  label?: string;
  value: React.ReactNode;
  /** Small unit suffix, e.g. "/5" or "%". */
  unit?: string;
  /** Trend value; number auto-colors (positive=up). */
  delta?: number | string;
  /** Override the arrow direction. */
  deltaDir?: 'up' | 'down' | 'flat';
  inverse?: boolean;
  className?: string;
}

export function Stat(props: StatProps): JSX.Element;
