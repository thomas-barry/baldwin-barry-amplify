import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** Any CSS width. Defaults to filling the container. */
  width?: string;
  height: string;
  /** Overrides the default small radius — pass var(--radius-md) etc. */
  radius?: string;
  className?: string;
}

/**
 * A placeholder block sized to the content it stands in for.
 *
 * The point is to occupy the same space the real content will, so the page does
 * not reflow when data arrives — a centred spinner collapses the layout and
 * then expands it again on every navigation.
 */
const Skeleton = ({ width = '100%', height, radius, className }: SkeletonProps) => (
  <div
    className={className ? `${styles.skeleton} ${className}` : styles.skeleton}
    style={{ width, height, borderRadius: radius }}
    aria-hidden='true'
  />
);

export default Skeleton;
