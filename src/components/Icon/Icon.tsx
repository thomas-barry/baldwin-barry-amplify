import type React from 'react';
import type { IconName } from './icons';
import { iconClass } from './icons';

/* The Icon component. The name union and `iconClass` live in ./icons so this
 * file exports only a component, which is what Fast Refresh requires. */

interface IconProps {
  name: IconName;
  /** Rotate continuously. Pair with `name='spinner'` for the usual busy affordance. */
  spin?: boolean;
  /** Extra classes for positioning; never for picking the glyph. */
  className?: string;
  /** Inline overrides for one-off sizing/colour at a call site. */
  style?: React.CSSProperties;
  /**
   * Icons here are decorative by default and hidden from assistive tech. Pass a
   * label only when the icon is the sole carrier of meaning.
   */
  label?: string;
}

export const Icon = ({ name, spin, className, label, style }: IconProps) => (
  <i
    className={`${iconClass(name, { spin })}${className ? ` ${className}` : ''}`}
    style={style}
    aria-hidden={label ? undefined : 'true'}
    aria-label={label}
    role={label ? 'img' : undefined}
  />
);

export default Icon;
