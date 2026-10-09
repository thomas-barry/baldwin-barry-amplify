import { iconClass } from '@/components/Icon';
import type { Quip, QuipContent } from '@/modules/quips';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import styles from './QuipRow.module.css';

interface QuipRowProps {
  quip: Quip;
  /** Commits a changed field. Not called when the value is unchanged. */
  onSave: (changes: { text?: string; quote?: string | null; attribution?: string | null }) => void;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
  /** Reports the quip to preview, as typed — fired on focus and on every keystroke. */
  onPreview: (content: QuipContent) => void;
  isPending: boolean;
}

/**
 * One inline field that holds local edits and commits the trimmed value on
 * blur. An empty value is committed only when `allowEmpty` is set; otherwise
 * it reverts.
 */
const useCommittedField = (serverValue: string, onCommit: (next: string) => void, allowEmpty: boolean) => {
  const [value, setValue] = useState(serverValue);
  const committed = useRef(serverValue);

  // The server is the source of truth: re-sync when a save round-trips, or when
  // the list refetches with a value edited elsewhere.
  useEffect(() => {
    setValue(serverValue);
    committed.current = serverValue;
  }, [serverValue]);

  const commit = () => {
    const next = value.trim();
    if ((next === '' && !allowEmpty) || next === committed.current) {
      setValue(committed.current);
      return;
    }
    committed.current = next;
    onCommit(next);
  };

  const revert = () => {
    setValue(committed.current);
    return committed.current;
  };

  return { value, setValue, commit, revert };
};

export const QuipRow = ({ quip, onSave, onToggleEnabled, onDelete, onPreview, isPending }: QuipRowProps) => {
  const text = useCommittedField(quip.text, next => onSave({ text: next }), false);
  // Clearing the quote or attribution removes it: stored as null, never as an
  // empty string.
  const quote = useCommittedField(quip.quote ?? '', next => onSave({ quote: next || null }), true);
  const attribution = useCommittedField(quip.attribution ?? '', next => onSave({ attribution: next || null }), true);

  /** The quip as currently typed, for the preview. */
  const current: QuipContent = { text: text.value, quote: quote.value, attribution: attribution.value };

  const handleKeyDown = (field: typeof text, name: keyof QuipContent) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur(); // blur commits
      return;
    }
    if (event.key === 'Escape') {
      onPreview({ ...current, [name]: field.revert() });
      event.currentTarget.blur();
    }
  };

  const fieldProps = (field: typeof text, name: keyof QuipContent) => ({
    value: field.value,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      field.setValue(event.target.value);
      onPreview({ ...current, [name]: event.target.value });
    },
    onFocus: () => onPreview(current),
    onBlur: field.commit,
    onKeyDown: handleKeyDown(field, name),
  });

  const disabled = quip.enabled === false;

  return (
    <li className={[styles.row, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}>
      {/* Laid out the way the panel shows them: the quote and its attribution
          on one line above the quip. The inputs stay enabled while a save is in
          flight — each commits only its own field, and disabling them would
          drop focus when tabbing between fields of the same row (every blur
          saves). */}
      <div className={styles.fields}>
        <div className={styles.quoteLine}>
          <InputText
            className={[styles.input, styles.quoteInput].join(' ')}
            placeholder='Quote (optional)'
            aria-label='Quote'
            {...fieldProps(quote, 'quote')}
          />
          <InputText
            className={[styles.input, styles.quoteInput, styles.attributionInput].join(' ')}
            placeholder='Attribution'
            aria-label='Attribution'
            {...fieldProps(attribution, 'attribution')}
          />
        </div>
        <InputText
          className={styles.input}
          aria-label='Quip text'
          {...fieldProps(text, 'text')}
        />
      </div>
      <InputSwitch
        checked={quip.enabled !== false}
        disabled={isPending}
        aria-label='Enabled'
        tooltip={quip.enabled === false ? 'Disabled — not in rotation' : 'In rotation'}
        onChange={event => onToggleEnabled(!!event.value)}
      />
      <Button
        icon={iconClass('trash')}
        text
        severity='danger'
        aria-label='Delete quip'
        disabled={isPending}
        onClick={onDelete}
      />
    </li>
  );
};

export default QuipRow;
