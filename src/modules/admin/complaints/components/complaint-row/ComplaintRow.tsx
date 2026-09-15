import { iconClass } from '@/components/Icon';
import { ANONYMOUS, type Complaint, DISSATISFACTION_MAX, dissatisfactionLabel } from '@/modules/complaints';
import { Button } from 'primereact/button';
import styles from './ComplaintRow.module.css';

interface ComplaintRowProps {
  complaint: Complaint;
  /** Only offered for pending complaints. */
  onApprove?: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export const ComplaintRow = ({ complaint, onApprove, onDelete, isPending }: ComplaintRowProps) => (
  <li className={styles.row}>
    <div className={styles.body}>
      <div className={styles.meta}>
        <span className={styles.nickname}>{complaint.nickname ?? ANONYMOUS}</span>
        {/* Admins get the full timestamp; the public page only ever gets the date. */}
        <time dateTime={complaint.submittedAt}>
          {new Date(complaint.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </time>
        <span>
          {complaint.dissatisfaction}/{DISSATISFACTION_MAX} · {dissatisfactionLabel(complaint.dissatisfaction)}
        </span>
      </div>
      <p className={styles.text}>{complaint.text}</p>
    </div>
    <div className={styles.actions}>
      {onApprove && (
        <Button
          label='Approve'
          icon={iconClass('check')}
          severity='success'
          size='small'
          disabled={isPending}
          onClick={onApprove}
        />
      )}
      <Button
        icon={iconClass('trash')}
        text
        severity='danger'
        aria-label='Delete complaint'
        disabled={isPending}
        onClick={onDelete}
      />
    </div>
  </li>
);

export default ComplaintRow;
