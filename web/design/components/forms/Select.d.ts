import * as React from 'react';

export interface SelectOption { value: string; label: string; }

/** Styled native <select> with chevron. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  /** Options as data; alternatively pass <option> children. */
  options?: SelectOption[];
  /** Disabled first option shown when value is empty. */
  placeholder?: string;
  children?: React.ReactNode;
}

export function Select(props: SelectProps): JSX.Element;
