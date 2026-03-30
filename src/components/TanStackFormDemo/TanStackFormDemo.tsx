import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import styles from './TanStackFormDemo.module.css';

interface FormValues {
  name: string;
  email: string;
  age: number;
  message: string;
}

const TanStackFormDemo = () => {
  const [submitted, setSubmitted] = useState<FormValues | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      age: 0,
      message: '',
    },
    onSubmit: async ({ value }) => {
      setSubmitted({ ...value });
      form.reset();
    },
  });

  if (submitted) {
    return (
      <div className={styles.success}>
        <p className={styles.successTitle}>Submitted!</p>
        <dl className={styles.successValues}>
          <dt>Name</dt>
          <dd>{submitted.name}</dd>
          <dt>Email</dt>
          <dd>{submitted.email}</dd>
          <dt>Age</dt>
          <dd>{submitted.age}</dd>
          <dt>Message</dt>
          <dd>{submitted.message}</dd>
        </dl>
        <button
          className={styles.resetButton}
          onClick={() => setSubmitted(null)}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}>
      <form.Field
        name='name'
        validators={{
          onBlur: ({ value }) =>
            !value.trim()
              ? 'Name is required'
              : value.trim().length < 2
                ? 'Name must be at least 2 characters'
                : undefined,
        }}>
        {field => (
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={field.name}>
              Name
            </label>
            <input
              id={field.name}
              className={`${styles.input}${field.state.meta.errors.length ? ` ${styles.inputError}` : ''}`}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder='Your name'
              autoComplete='name'
            />
            {field.state.meta.errors.length > 0 && <span className={styles.error}>{field.state.meta.errors[0]}</span>}
          </div>
        )}
      </form.Field>

      <form.Field
        name='email'
        validators={{
          onBlur: ({ value }) => {
            if (!value.trim()) return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
            return undefined;
          },
        }}>
        {field => (
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={field.name}>
              Email
            </label>
            <input
              id={field.name}
              type='email'
              className={`${styles.input}${field.state.meta.errors.length ? ` ${styles.inputError}` : ''}`}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder='you@example.com'
              autoComplete='email'
            />
            {field.state.meta.errors.length > 0 && <span className={styles.error}>{field.state.meta.errors[0]}</span>}
          </div>
        )}
      </form.Field>

      <form.Field
        name='age'
        validators={{
          onChange: ({ value }) => (value > 0 && value < 18 ? 'Must be at least 18' : undefined),
          onBlur: ({ value }) =>
            !value
              ? 'Age is required'
              : value < 18
                ? 'Must be at least 18'
                : value > 120
                  ? 'Enter a realistic age'
                  : undefined,
        }}>
        {field => (
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={field.name}>
              Age
            </label>
            <input
              id={field.name}
              type='number'
              min={0}
              max={120}
              className={`${styles.input} ${styles.inputNarrow}${field.state.meta.errors.length ? ` ${styles.inputError}` : ''}`}
              value={field.state.value || ''}
              onChange={e => field.handleChange(e.target.valueAsNumber)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && <span className={styles.error}>{field.state.meta.errors[0]}</span>}
          </div>
        )}
      </form.Field>

      <form.Field
        name='message'
        validators={{
          onBlur: ({ value }) =>
            !value.trim()
              ? 'Message is required'
              : value.trim().length < 10
                ? 'Message must be at least 10 characters'
                : undefined,
        }}>
        {field => (
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={field.name}>
              Message
            </label>
            <textarea
              id={field.name}
              className={`${styles.input} ${styles.textarea}${field.state.meta.errors.length ? ` ${styles.inputError}` : ''}`}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder='Say something...'
              rows={3}
            />
            {field.state.meta.errors.length > 0 && <span className={styles.error}>{field.state.meta.errors[0]}</span>}
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button
            type='submit'
            className={styles.submitButton}
            disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
};

export default TanStackFormDemo;
