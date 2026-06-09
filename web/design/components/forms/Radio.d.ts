import * as React from 'react';

/** Single radio option; share a `name` across a group. Set `card` for selectable tiles. */
export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
  /** Render as a bordered selectable card. */
  card?: boolean;
  disabled?: boolean;
}

export function Radio(props: RadioProps): JSX.Element;
