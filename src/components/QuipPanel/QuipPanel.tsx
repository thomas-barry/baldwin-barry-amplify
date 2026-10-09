import styles from './QuipPanel.module.css';

interface QuipPanelProps {
  /** The quip to render. */
  children: React.ReactNode;
  /** The line the quip answers, shown above it in smaller italic. */
  quote?: string | null;
  /** Who said the quote, shown inline after it. Ignored when there is no quote. */
  attribution?: string | null;
  /** Additional class name applied to the panel. */
  className?: string;
}

/** Quote marks the admin may have typed at either end — the panel adds its own. */
const EDGE_QUOTES = /^["“”]+|["“”]+$/g;

/** A dash the admin may have typed before the attribution — the panel adds its own. */
const LEADING_DASHES = /^[-‑–—\s]+/;

/**
 * The black-and-orange panel a quip is displayed on.
 *
 * Shared deliberately: the home page curtain and the admin preview must render
 * a quip identically, or the preview stops being a reliable guide to how long
 * a line can be before it wraps badly. Fills its container, so the caller owns
 * the box — the hero card and the admin preview both size it to 500 x 624.
 */
export const QuipPanel = ({ children, quote, attribution, className = '' }: QuipPanelProps) => {
  const quoted = quote?.trim().replace(EDGE_QUOTES, '').trim();
  const attributed = attribution?.trim().replace(LEADING_DASHES, '');

  return (
    <div className={[styles.panel, className].filter(Boolean).join(' ')}>
      {quoted && (
        <p className={styles.quote}>
          “{quoted}”
          {/* Non-breaking hyphens (U+2011) and space: browsers break after an
              ordinary hyphen, which strands the dash at the end of a line
              without its name. Same glyph as "-" in Inter Tight. */}
          {attributed && ` \u2011\u2011\u00a0${attributed}`}
        </p>
      )}
      {children}
    </div>
  );
};

export default QuipPanel;
