import { iconClass } from '@/components/Icon';
import { QuipPanel } from '@/components/QuipPanel';
import { getAdminClient } from '@/lib/dataClient';
import { allQuipsQueryOptions, type Quip, type QuipContent } from '@/modules/quips';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { QuipRow } from './components/quip-row';
import styles from './QuipsAdmin.module.css';

/** The draft row's inputs, untrimmed. */
interface Draft {
  text: string;
  quote: string;
  attribution: string;
}

const EMPTY_DRAFT: Draft = { text: '', quote: '', attribution: '' };

const QuipsAdmin = () => {
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);
  const { data: quips, isLoading, isError, error, refetch } = useQuery(allQuipsQueryOptions());

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [preview, setPreview] = useState<QuipContent>({ text: '' });
  const draftQuoteInput = useRef<HTMLInputElement>(null);
  const draftTextInput = useRef<HTMLInputElement>(null);

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
    mutationFn: (content: QuipContent) => getAdminClient().models.Quip.create({ ...content, enabled: true }),
    onSuccess: () => {
      setDraft(EMPTY_DRAFT);
      // Refocusing fires onFocus with this render's drafts, so the preview keeps
      // showing the quip just added until the next keystroke.
      draftQuoteInput.current?.focus();
      invalidate();
    },
    onError: showError('Could not add quip'),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      text?: string;
      quote?: string | null;
      attribution?: string | null;
      enabled?: boolean;
    }) => getAdminClient().models.Quip.update(input),
    onSuccess: invalidate,
    onError: showError('Could not save quip'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getAdminClient().models.Quip.delete({ id }),
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

  const draftProps = (name: keyof Draft) => ({
    value: draft[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const next = { ...draft, [name]: event.target.value };
      setDraft(next);
      setPreview(next);
    },
    onFocus: () => setPreview(draft),
  });

  // Enter in the quote or attribution moves on to the quip — neither can be
  // saved alone.
  const handleDraftLeadInKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') draftTextInput.current?.focus();
  };

  const handleDraftTextKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || createMutation.isPending) return;
    const text = draft.text.trim();
    if (text === '') return;
    createMutation.mutate({
      text,
      quote: draft.quote.trim() || null,
      attribution: draft.attribution.trim() || null,
    });
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
                icon={iconClass('refresh')}
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
                  onSave={changes => updateMutation.mutate({ id: quip.id, ...changes })}
                  onToggleEnabled={enabled => updateMutation.mutate({ id: quip.id, enabled })}
                  onDelete={() => handleDelete(quip)}
                />
              ))}

              {/* Pinned draft row: adding several in a row never needs the mouse.
                  Not disabled while a create is in flight — that would drop
                  focus, and success hands it back to the quote input. */}
              <li className={styles.draftRow}>
                <div className={styles.draftQuoteLine}>
                  <InputText
                    ref={draftQuoteInput}
                    className={[styles.draftInput, styles.draftQuoteInput].join(' ')}
                    placeholder='Quote (optional)'
                    aria-label='New quote'
                    onKeyDown={handleDraftLeadInKeyDown}
                    {...draftProps('quote')}
                  />
                  <InputText
                    className={[styles.draftInput, styles.draftQuoteInput, styles.draftAttributionInput].join(' ')}
                    placeholder='Attribution'
                    aria-label='New attribution'
                    onKeyDown={handleDraftLeadInKeyDown}
                    {...draftProps('attribution')}
                  />
                </div>
                <InputText
                  ref={draftTextInput}
                  className={styles.draftInput}
                  placeholder='Add a quip, then press Enter'
                  aria-label='New quip'
                  onKeyDown={handleDraftTextKeyDown}
                  {...draftProps('text')}
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
            <QuipPanel
              quote={preview.quote}
              attribution={preview.attribution}>
              {preview.text}
            </QuipPanel>
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
