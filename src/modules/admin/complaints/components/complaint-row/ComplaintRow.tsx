import { iconClass } from '@/components/Icon';
import {
  ANONYMOUS,
  type Complaint,
  DISSATISFACTION_MAX,
  dissatisfactionLabel,
  RESPONDER,
  RESPONSE_MAX,
} from '@/modules/complaints';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { useState } from 'react';
import styles from './ComplaintRow.module.css';

interface ComplaintRowProps {
  complaint: Complaint;
  /** Only offered for pending complaints. */
  onApprove?: () => void;
  onDelete: () => void;
  /** Saves the response; an empty string removes it. Rejects if the save failed. */
  onSaveResponse: (response: string) => Promise<void>;
  isPending: boolean;
}

export const ComplaintRow = ({ complaint, onApprove, onDelete, onSaveResponse, isPending }: ComplaintRowProps) => {
  // The draft is form state, not server state: it only exists while editing.
  const [draft, setDraft] = useState<string | null>(null);
  const isEditing = draft !== null;

  const handleSave = async () => {
    if (draft === null) return;
    try {
      await onSaveResponse(draft);
      setDraft(null);
    } catch {
      // Stay open with the draft intact; the page shows the error.
    }
  };

  return (
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

        {isEditing ? (
          <div className={styles.editor}>
            <label
              htmlFor={`response-${complaint.id}`}
              className={styles.responder}>
              {RESPONDER} responds
            </label>
            <InputTextarea
              id={`response-${complaint.id}`}
              className='w-full'
              value={draft}
              maxLength={RESPONSE_MAX}
              rows={3}
              autoResize
              autoFocus
              placeholder='Leave empty to remove the response.'
              disabled={isPending}
              onChange={event => setDraft(event.target.value)}
            />
            <div className={styles.editorActions}>
              <Button
                label='Save'
                icon={iconClass('check')}
                size='small'
                loading={isPending}
                onClick={handleSave}
              />
              <Button
                label='Cancel'
                text
                size='small'
                disabled={isPending}
                onClick={() => setDraft(null)}
              />
            </div>
          </div>
        ) : (
          complaint.response && (
            <div className={styles.response}>
              <p className={styles.responder}>
                {RESPONDER} responds
                {complaint.respondedAt && (
                  <time
                    className={styles.respondedAt}
                    dateTime={complaint.respondedAt}>
                    {new Date(complaint.respondedAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </time>
                )}
              </p>
              <p className={styles.text}>{complaint.response}</p>
            </div>
          )
        )}
      </div>
      <div className={styles.actions}>
        {!isEditing && (
          <Button
            label={complaint.response ? 'Edit response' : 'Respond'}
            icon={iconClass('pencil')}
            text
            size='small'
            disabled={isPending}
            onClick={() => setDraft(complaint.response ?? '')}
          />
        )}
        {/* Unavailable mid-edit, like Delete below: approving would put the
            complaint on the wall without the response still being written. */}
        {onApprove && (
          <Button
            label='Approve'
            icon={iconClass('check')}
            severity='success'
            size='small'
            disabled={isPending || isEditing}
            onClick={onApprove}
          />
        )}
        {/* Unavailable mid-edit: deleting the complaint under an open editor
            would throw away whatever was being typed into it. */}
        <Button
          icon={iconClass('trash')}
          text
          severity='danger'
          aria-label='Delete complaint'
          disabled={isPending || isEditing}
          onClick={onDelete}
        />
      </div>
    </li>
  );
};

export default ComplaintRow;
