import * as React from 'react';

/** Checkbox with optional label and description text. */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
}

export function Checkbox(props: CheckboxProps): JSX.Element;
