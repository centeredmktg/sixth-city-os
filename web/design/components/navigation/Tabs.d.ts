import * as React from 'react';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional count pill. */
  count?: number;
}

/** Tab navigation — underline or pill (segmented) style. */
export interface TabsProps {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function Tabs(props: TabsProps): JSX.Element;
