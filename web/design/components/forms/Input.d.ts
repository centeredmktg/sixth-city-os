import * as React from 'react';

/** Labelled text input with optional leading/trailing icons, hint and error. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Helper text shown below when there is no error. */
  hint?: string;
  /** Error message; turns the field red and replaces the hint. */
  error?: string;
  required?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Input(props: InputProps): JSX.Element;
