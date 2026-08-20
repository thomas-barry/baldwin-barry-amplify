import type { Quip } from '@/modules/quips';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import styles from './QuipRow.module.css';

interface QuipRowProps {
  quip: Quip;
  /** Commits a changed text. Not called when the text is unchanged or empty. */
  onSave: (text: string) => void;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
  /** Reports the text to preview — fired on focus and on every keystroke. */
  onPreview: (text: string) => void;
  isPending: boolean;
}

export const QuipRow = ({ quip, onSave, onToggleEnabled, onDelete, onPreview, isPending }: QuipRowProps) => {
  const [value, setValue] = useState(quip.text);
  const committed = useRef(quip.text);

  // The server is the source of truth: re-sync when a save round-trips, or when
  // the list refetches with a value edited elsewhere.
  useEffect(() => {
    setValue(quip.text);
    committed.current = quip.text;
  }, [quip.text]);

  const commit = () => {
    const next = value.trim();
    if (next === '' || next === committed.current) {
      setValue(committed.current);
      return;
    }
    committed.current = next;
    onSave(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur(); // blur commits
      return;
    }
    if (event.key === 'Escape') {
      setValue(committed.current);
      onPreview(committed.current);
      event.currentTarget.blur();
    }
  };

  const disabled = quip.enabled === false;

  return (
    <li className={[styles.row, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}>
      <InputText
        className={styles.input}
        value={value}
        disabled={isPending}
        aria-label='Quip text'
        onChange={event => {
          setValue(event.target.value);
          onPreview(event.target.value);
        }}
        onFocus={() => onPreview(value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <InputSwitch
        checked={quip.enabled !== false}
        disabled={isPending}
        aria-label='Enabled'
        tooltip={quip.enabled === false ? 'Disabled — not in rotation' : 'In rotation'}
        onChange={event => onToggleEnabled(!!event.value)}
      />
      <Button
        icon='pi pi-trash'
        className='p-button-text p-button-danger'
        aria-label='Delete quip'
        disabled={isPending}
        onClick={onDelete}
      />
    </li>
  );
};

export default QuipRow;
