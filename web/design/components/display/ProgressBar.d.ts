import * as React from 'react';

/** Linear progress / completion bar. */
export interface ProgressBarProps {
  value?: number;
  max?: number;
  label?: string;
  /** Show the right-aligned value text. */
  showValue?: boolean;
  tone?: 'brand' | 'gold' | 'success';
  size?: 'md' | 'lg';
  /** Custom value formatter, e.g. (v,max)=>`${v}/${max} responses`. */
  format?: (value: number, max: number) => React.ReactNode;
  className?: string;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;
