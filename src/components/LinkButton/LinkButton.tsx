/* A router Link that looks like a PrimeReact Button.
 *
 * Ten places needed a control that navigates (so it must be an <a>, for
 * middle-click, copy-link and the router's prefetching) while looking like a
 * button. PrimeReact 10's Button always renders a <button> and offers no
 * `asChild`, so each site hand-wrote its markup instead:
 *
 *   <Link className='p-button p-component p-button-icon-only p-button-sm
 *                    p-button-info p-button-rounded'>
 *     <span className='p-button-icon pi pi-pencil' aria-hidden='true' />
 *   </Link>
 *
 * That is a copy of PrimeReact's internal DOM contract, repeated ten times,
 * checked by nothing. The class names are not public API; they change when
 * PrimeReact changes, and when they do these degrade into bare links with no
 * error anywhere.
 *
 * The strings now live here once. The props are deliberately named after
 * PrimeReact 11's Button vocabulary — `severity`, `variant`, `size`, `rounded`,
 * `iconOnly` — rather than v10's class names, so the v11 migration rewrites this
 * file and leaves all ten call sites alone. `severity='warn'` is v11's spelling
 * of v10's `warning`; it is not used here, but do not add `warning`. */

import type { IconName } from '@/components/Icon';
import { Icon } from '@/components/Icon';
import { createLink } from '@tanstack/react-router';
import type { AnchorHTMLAttributes, Ref } from 'react';

type Severity = 'secondary' | 'info' | 'success' | 'warn' | 'help' | 'danger' | 'contrast';

interface LinkButtonBaseProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  ref?: Ref<HTMLAnchorElement>;
  /** Leading icon. With `label` omitted, pass `iconOnly` and an `aria-label`. */
  icon?: IconName;
  /** Visible text. Omit for an icon-only control. */
  label?: string;
  severity?: Severity;
  /** `text` drops the fill; PrimeReact 10 spells this `p-button-text`. */
  variant?: 'text' | 'outlined';
  size?: 'small' | 'large';
  rounded?: boolean;
  iconOnly?: boolean;
}

const SEVERITY_CLASS: Record<Severity, string> = {
  secondary: 'p-button-secondary',
  info: 'p-button-info',
  success: 'p-button-success',
  warn: 'p-button-warning',
  help: 'p-button-help',
  danger: 'p-button-danger',
  contrast: 'p-button-contrast',
};

const LinkButtonBase = ({
  icon,
  label,
  severity,
  variant,
  size,
  rounded,
  iconOnly,
  className,
  children,
  ...rest
}: LinkButtonBaseProps) => {
  const classes = [
    'p-button',
    'p-component',
    severity && SEVERITY_CLASS[severity],
    variant === 'text' && 'p-button-text',
    variant === 'outlined' && 'p-button-outlined',
    size === 'small' && 'p-button-sm',
    size === 'large' && 'p-button-lg',
    rounded && 'p-button-rounded',
    iconOnly && 'p-button-icon-only',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      className={classes}
      {...rest}>
      {icon && (
        <Icon
          name={icon}
          className={`p-button-icon${label ? ' p-button-icon-left' : ''}`}
        />
      )}
      {label && <span className='p-button-label'>{label}</span>}
      {children}
    </a>
  );
};

// createLink returns a generic function rather than a plain component, which
// the Fast Refresh heuristic cannot recognise as one. It is a component.
// eslint-disable-next-line react-refresh/only-export-components
export const LinkButton = createLink(LinkButtonBase);

export default LinkButton;
