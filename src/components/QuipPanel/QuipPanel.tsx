import styles from './QuipPanel.module.css';

interface QuipPanelProps {
  /** The quip to render. */
  children: React.ReactNode;
  /** Additional class name applied to the panel. */
  className?: string;
}

/**
 * The black-and-orange panel a quip is displayed on.
 *
 * Shared deliberately: the home page curtain and the admin preview must render
 * a quip identically, or the preview stops being a reliable guide to how long
 * a line can be before it wraps badly. Fills its container, so the caller owns
 * the box — the hero card and the admin preview both size it to 500 x 624.
 */
export const QuipPanel = ({ children, className = '' }: QuipPanelProps) => (
  <div className={[styles.panel, className].filter(Boolean).join(' ')}>{children}</div>
);

export default QuipPanel;
