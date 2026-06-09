import * as React from 'react';

/**
 * Segmented 1..max rating scale — the core 360 survey input.
 * @startingPoint section="Forms" subtitle="360 survey rating scale with anchor labels" viewport="700x140"
 */
export interface RatingScaleProps {
  /** Number of points. Default 5 (Likert). */
  max?: number;
  /** Selected value (1..max, or 'na'). */
  value?: number | 'na';
  /** Called with the chosen value. */
  onChange?: (value: number | 'na') => void;
  /** Anchor label under the low end. */
  minLabel?: string;
  /** Anchor label under the high end. */
  maxLabel?: string;
  /** Append a "N/A" option. */
  allowNA?: boolean;
  className?: string;
}

export function RatingScale(props: RatingScaleProps): JSX.Element;
