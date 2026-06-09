import * as React from 'react';

/** On/off toggle switch. */
export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  size?: 'sm' | 'md';
  checked?: boolean;
  disabled?: boolean;
}

export function Switch(props: SwitchProps): JSX.Element;
