import * as React from 'react';

/**
 * The 360° score donut — the brand's signature data viz. Animates an arc to value/max.
 * @startingPoint section="Display" subtitle="Animated 360° score ring" viewport="400x220"
 */
export interface ScoreRingProps {
  /** Current value. */
  value?: number;
  /** Scale maximum. Default 5. Set the denominator shown in the center. */
  max?: number;
  /** Diameter in px. Default 120. */
  size?: number;
  /** Arc thickness in px. Defaults to ~10% of size. */
  thickness?: number;
  /** Arc color ramp. */
  tone?: 'brand' | 'gold' | 'success';
  /** For dark backgrounds. */
  inverse?: boolean;
  /** Label rendered below the ring. */
  label?: string;
  /** Small mono caption inside the ring (e.g. "overall"). */
  caption?: string;
  /** Custom center formatter; when set, hides the "/max" suffix. */
  format?: (value: number) => React.ReactNode;
  className?: string;
}

export function ScoreRing(props: ScoreRingProps): JSX.Element;
