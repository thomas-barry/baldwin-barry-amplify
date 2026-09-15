import Knob from '@/components/Knob';
import { useMutation } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
  DISSATISFACTION_DEFAULT,
  DISSATISFACTION_MAX,
  DISSATISFACTION_MIN,
  NICKNAME_MAX,
  TEXT_MAX,
  TEXT_MIN,
  dissatisfactionLabel,
} from '../../dissatisfaction';
import { clientPublic, throwOnErrors } from '../../queries';
import styles from './ComplaintForm.module.css';

interface ComplaintInput {
  text: string;
  nickname?: string;
  dissatisfaction: number;
  website?: string;
}

export const ComplaintForm = () => {
  const [dissatisfaction, setDissatisfaction] = useState(DISSATISFACTION_DEFAULT);
  const [nickname, setNickname] = useState('');
  const [text, setText] = useState('');
  const [website, setWebsite] = useState('');

  const mutation = useMutation({
    mutationFn: async (input: ComplaintInput) => {
      const { errors } = await clientPublic.mutations.submitComplaint(input);
      throwOnErrors(errors);
    },
    onSuccess: () => {
      setText('');
      setNickname('');
      setDissatisfaction(DISSATISFACTION_DEFAULT);
      setWebsite('');
    },
  });

  const textLength = text.trim().length;
  const canSubmit = textLength >= TEXT_MIN && textLength <= TEXT_MAX && !mutation.isPending;

  // The confirmation belongs to the complaint just filed; starting the next one clears it.
  const clearConfirmation = () => {
    if (mutation.isSuccess) mutation.reset();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      text: text.trim(),
      nickname: nickname.trim() || undefined,
      dissatisfaction,
      website: website || undefined,
    });
  };

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate>
      {/* The Knob's labels and readout are drawn light-on-dark, so it needs its own dark panel. */}
      <div className={styles.knobPanel}>
        <Knob
          value={dissatisfaction}
          onChange={value => {
            setDissatisfaction(Math.round(value));
            clearConfirmation();
          }}
          minValue={DISSATISFACTION_MIN}
          maxValue={DISSATISFACTION_MAX}
          minMaxLabels={false}
          ticks={DISSATISFACTION_MAX - DISSATISFACTION_MIN + 1}
          aria-label='Dissatisfaction'
          // Announces "8 out of 11, Fuming" rather than the Knob's default percentage.
          valueText={value => `${Math.round(value)} out of ${DISSATISFACTION_MAX}, ${dissatisfactionLabel(value)}`}
        />
        <span className={styles.knobCaption}>Dissatisfaction:</span>
        <span className={styles.knobLevel}>{dissatisfactionLabel(dissatisfaction)}</span>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label
            htmlFor='complaint-nickname'
            className={styles.label}>
            Nickname <span className={styles.optional}>(optional)</span>
          </label>
          <InputText
            id='complaint-nickname'
            className='w-full'
            value={nickname}
            maxLength={NICKNAME_MAX}
            placeholder='Anonymous'
            autoComplete='off'
            onChange={event => {
              setNickname(event.target.value);
              clearConfirmation();
            }}
          />
        </div>

        <div className={styles.field}>
          <label
            htmlFor='complaint-text'
            className={styles.label}>
            Complaint
          </label>
          <InputTextarea
            id='complaint-text'
            className='w-full'
            value={text}
            maxLength={TEXT_MAX}
            rows={5}
            autoResize
            placeholder='Go on, then.'
            onChange={event => {
              setText(event.target.value);
              clearConfirmation();
            }}
          />
          <div className={styles.hint}>
            <span>
              Don&apos;t include anything you wouldn&apos;t want on a public wall. Minimum {TEXT_MIN} characters.
            </span>
            <span className={styles.count}>
              {textLength}/{TEXT_MAX}
            </span>
          </div>
        </div>

        {/* Honeypot. Off-screen and out of the tab order, so only bots fill it in. */}
        <div
          className={styles.honeypot}
          aria-hidden='true'>
          <label htmlFor='complaint-website'>Website</label>
          <input
            id='complaint-website'
            type='text'
            tabIndex={-1}
            autoComplete='off'
            value={website}
            onChange={event => setWebsite(event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <Button
            type='submit'
            label='File complaint'
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </div>

        {mutation.isSuccess && (
          <p
            role='status'
            className={styles.confirmation}>
            Your complaint has been filed and will be ignored in the order it was received.
          </p>
        )}
        {mutation.isError && (
          <p
            role='alert'
            className={styles.error}>
            Your complaint could not be filed. The complaints department appears to be broken, which is ironic. Please
            try again later.
          </p>
        )}
      </div>
    </form>
  );
};

export default ComplaintForm;
