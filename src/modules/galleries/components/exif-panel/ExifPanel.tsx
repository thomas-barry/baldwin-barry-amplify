import type { ExifSummary } from '@/lib/exif';
import styles from './ExifPanel.module.css';

interface ExifPanelProps {
  summary: ExifSummary | null;
  visible: boolean;
}

interface ExifRow {
  label: string;
  value: string;
}

/**
 * Read-only overlay listing the camera settings a photo was taken with.
 *
 * Purely presentational — the summary is computed once per image by
 * `summarizeExif` in PhotoCarousel's memo, so this component never parses.
 */
const ExifPanel = ({ summary, visible }: ExifPanelProps) => {
  if (!visible || !summary) return null;

  const rows: ExifRow[] = [
    { label: 'Aperture', value: summary.aperture },
    { label: 'Shutter', value: summary.shutter },
    { label: 'ISO', value: summary.iso },
    { label: 'Focal length', value: summary.focalLength },
    { label: 'Exposure', value: summary.exposureBias },
    { label: 'Flash', value: summary.flash },
    { label: 'Taken', value: summary.capturedAt },
    { label: 'Software', value: summary.software },
  ].filter((row): row is ExifRow => Boolean(row.value));

  return (
    <aside
      className={styles.panel}
      aria-label='Camera details'>
      {summary.camera && <h4 className={styles.camera}>{summary.camera}</h4>}
      {summary.lens && <p className={styles.lens}>{summary.lens}</p>}

      {rows.length > 0 && (
        <dl className={styles.rows}>
          {rows.map(({ label, value }) => (
            <div
              className={styles.row}
              key={label}>
              <dt className={styles.label}>{label}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
};

export default ExifPanel;
