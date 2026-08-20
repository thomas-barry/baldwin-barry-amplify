import { QuipPanel } from '@/components/QuipPanel';
import { allQuipsQueryOptions, type Quip } from '@/modules/quips';
import type { Schema } from '@/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import type { KeyboardEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { QuipRow } from './components/quip-row';
import styles from './QuipsAdmin.module.css';

const clientWrite = generateClient<Schema>({ authMode: 'userPool' });

const QuipsAdmin = () => {
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);
  const { data: quips, isLoading, isError, error, refetch } = useQuery(allQuipsQueryOptions());

  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState('');

  const showError = (summary: string) => (err: unknown) =>
    toast.current?.show({
      severity: 'error',
      summary,
      detail: err instanceof Error ? err.message : 'Something went wrong.',
      life: 5000,
    });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['quips'] });

  const createMutation = useMutation({
    // `enabled` is written explicitly rather than left to the schema default, so
    // no row can carry a null and the rotation's `eq: true` filter stays safe.
    mutationFn: (text: string) => clientWrite.models.Quip.create({ text, enabled: true }),
    onSuccess: () => {
      setDraft('');
      invalidate();
    },
    onError: showError('Could not add quip'),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; text?: string; enabled?: boolean }) => clientWrite.models.Quip.update(input),
    onSuccess: invalidate,
    onError: showError('Could not save quip'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientWrite.models.Quip.delete({ id }),
    onSuccess: invalidate,
    onError: showError('Could not delete quip'),
  });

  const pendingId = updateMutation.isPending
    ? updateMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables
      : undefined;

  const ordered = useMemo(() => [...(quips ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [quips]);

  const enabledCount = ordered.filter(quip => quip.enabled !== false).length;

  const handleDelete = (quip: Quip) => {
    if (window.confirm(`Delete "${quip.text}"? This cannot be undone.`)) {
      deleteMutation.mutate(quip.id);
    }
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const text = draft.trim();
    if (text !== '') createMutation.mutate(text);
  };

  return (
    <div className={styles.page}>
      <Toast ref={toast} />
      <header className={styles.header}>
        <h1 className={styles.title}>Quips</h1>
        <p className={styles.subtitle}>
          Lines shown behind the home page curtain. {enabledCount} of {ordered.length} in rotation.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.listPane}>
          {isLoading && <ProgressSpinner />}

          {isError && (
            <div className={styles.error}>
              <p>{error instanceof Error ? error.message : 'Could not load quips.'}</p>
              <Button
                label='Try again'
                icon='pi pi-refresh'
                onClick={() => refetch()}
              />
            </div>
          )}

          {!isLoading && !isError && (
            <ul className={styles.list}>
              {ordered.map(quip => (
                <QuipRow
                  key={quip.id}
                  quip={quip}
                  isPending={pendingId === quip.id}
                  onPreview={setPreview}
                  onSave={text => updateMutation.mutate({ id: quip.id, text })}
                  onToggleEnabled={enabled => updateMutation.mutate({ id: quip.id, enabled })}
                  onDelete={() => handleDelete(quip)}
                />
              ))}

              {/* Pinned draft row: adding several in a row never needs the mouse. */}
              <li className={styles.draftRow}>
                <InputText
                  className={styles.draftInput}
                  value={draft}
                  placeholder='Add a quip, then press Enter'
                  aria-label='New quip'
                  disabled={createMutation.isPending}
                  onChange={event => {
                    setDraft(event.target.value);
                    setPreview(event.target.value);
                  }}
                  onFocus={() => setPreview(draft)}
                  onKeyDown={handleDraftKeyDown}
                />
              </li>
            </ul>
          )}
        </section>

        <aside className={styles.previewPane}>
          <h2 className={styles.previewLabel}>Preview</h2>
          {/* Sized to the hero card exactly, so the wrap you see here is the
              wrap the home page will produce. There is no character limit —
              this is the only length feedback there is. */}
          <div className={styles.previewCard}>
            <QuipPanel>{preview}</QuipPanel>
          </div>
          <p className={styles.previewHint}>
            Focus a quip to preview it. Long lines wrap — if it looks wrong here, it looks wrong on the home page.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default QuipsAdmin;
