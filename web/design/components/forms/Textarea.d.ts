import * as React from 'react';

/** Multi-line text input with optional character counter. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** When set with a controlled `value`, shows a live character counter. */
  maxLength?: number;
}

export function Textarea(props: TextareaProps): JSX.Element;
