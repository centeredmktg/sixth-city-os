import * as React from 'react';

/** Filter / keyword chip — selectable and/or removable. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Selected (teal) state. */
  selected?: boolean;
  /** Show a remove "×"; called when clicked. */
  onRemove?: () => void;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Tag(props: TagProps): JSX.Element;
