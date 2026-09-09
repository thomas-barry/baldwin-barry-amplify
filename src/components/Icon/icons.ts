/* The single seam between this app and PrimeIcons.
 *
 * Every icon in the app goes through `IconName`, so a typo is a compile error
 * rather than a blank space nobody notices — `pi pi-pencl` renders nothing at
 * all and no tool in this repo would catch it.
 *
 * It also exists for the PrimeReact 11 migration. v11 drops the icon font
 * entirely: icons become React components from `@primeicons/react`, and v11's
 * Button has no `icon` prop, so string icons become children. Routing all ~47
 * call sites through here means that migration edits this file and the call
 * sites' props, not 47 scattered class strings. All 39 names below are
 * confirmed present in @primeicons/react 8. */

import styles from './Icon.module.css';

export type IconName =
  | 'arrow-left'
  | 'ban'
  | 'bars'
  | 'book'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'cog'
  | 'comment'
  | 'copy'
  | 'envelope'
  | 'exclamation-triangle'
  | 'expand'
  | 'eye'
  | 'home'
  | 'image'
  | 'images'
  | 'info-circle'
  | 'list'
  | 'lock'
  | 'moon'
  | 'pencil'
  | 'plus'
  | 'refresh'
  | 'save'
  | 'search'
  | 'sign-in'
  | 'sign-out'
  | 'sort'
  | 'sort-alt'
  | 'spinner'
  | 'star'
  | 'star-fill'
  | 'sun'
  | 'th-large'
  | 'times'
  | 'trash'
  | 'upload'
  | 'user';

/**
 * Class string for APIs that take an icon as a string rather than a node —
 * PrimeReact 10's `icon` prop on Button and friends.
 *
 * `spin` is not an icon: `pi-spin` is PrimeIcons' rotation modifier, and it is
 * the one thing here with no counterpart in @primeicons/react 8, so it resolves
 * to a local keyframe instead of the vendor class.
 */
export const iconClass = (name: IconName, options?: { spin?: boolean }): string =>
  `pi pi-${name}${options?.spin ? ` ${styles.spin}` : ''}`;
