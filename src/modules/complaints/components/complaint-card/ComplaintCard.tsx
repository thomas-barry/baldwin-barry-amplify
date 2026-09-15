import { ANONYMOUS, DISSATISFACTION_MAX, dissatisfactionLabel } from '../../dissatisfaction';
import type { PublicComplaint } from '../../types';
import styles from './ComplaintCard.module.css';

interface ComplaintCardProps {
  complaint: PublicComplaint;
}

// `submittedOn` is a UTC calendar date. Formatting it in the viewer's zone
// would show the previous day to anyone west of Greenwich.
const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const ComplaintCard = ({ complaint }: ComplaintCardProps) => (
  <li className={styles.card}>
    <header className={styles.meta}>
      <span className={styles.nickname}>{complaint.nickname ?? ANONYMOUS}</span>
      <time dateTime={complaint.submittedOn}>{formatDate(complaint.submittedOn)}</time>
    </header>
    {/* Rendered as a text node, never as Markdown or HTML: no links, no markup. */}
    <p className={styles.text}>{complaint.text}</p>
    <p className={styles.level}>
      <span className={styles.reading}>
        {complaint.dissatisfaction}/{DISSATISFACTION_MAX}
      </span>{' '}
      · {dissatisfactionLabel(complaint.dissatisfaction)}
    </p>
  </li>
);

export default ComplaintCard;
