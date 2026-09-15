import { iconClass } from '@/components/Icon';
import {
  ANONYMOUS,
  clientAdmin,
  type Complaint,
  complaintsByStatusQueryOptions,
  throwOnErrors,
} from '@/modules/complaints';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import styles from './ComplaintsAdmin.module.css';
import { ComplaintRow } from './components/complaint-row';

const ComplaintsAdmin = () => {
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);
  const pending = useQuery(complaintsByStatusQueryOptions('PENDING'));
  const approved = useQuery(complaintsByStatusQueryOptions('APPROVED'));

  const showError = (summary: string) => (err: unknown) =>
    toast.current?.show({
      severity: 'error',
      summary,
      detail: err instanceof Error ? err.message : 'Something went wrong.',
      life: 5000,
    });

  // Covers the public wall's cache too, so an approval shows there without a reload.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['complaints'] });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { errors } = await clientAdmin.models.Complaint.update({ id, status: 'APPROVED' });
      throwOnErrors(errors);
    },
    onSuccess: invalidate,
    onError: showError('Could not approve complaint'),
  });

  // There is no rejected state: a complaint that is not approved is deleted.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { errors } = await clientAdmin.models.Complaint.delete({ id });
      throwOnErrors(errors);
    },
    onSuccess: invalidate,
    onError: showError('Could not delete complaint'),
  });

  const busyId = approveMutation.isPending
    ? approveMutation.variables
    : deleteMutation.isPending
      ? deleteMutation.variables
      : undefined;

  const handleDelete = (complaint: Complaint) => {
    if (window.confirm(`Delete this complaint from ${complaint.nickname ?? ANONYMOUS}? This cannot be undone.`)) {
      deleteMutation.mutate(complaint.id);
    }
  };

  const renderList = (query: typeof pending, emptyText: string, approvable: boolean) => {
    if (query.isLoading) return <ProgressSpinner />;
    if (query.isError) {
      return (
        <div className={styles.error}>
          <p>{query.error instanceof Error ? query.error.message : 'Could not load complaints.'}</p>
          <Button
            label='Try again'
            icon={iconClass('refresh')}
            onClick={() => query.refetch()}
          />
        </div>
      );
    }
    if (!query.data?.length) return <p className={styles.empty}>{emptyText}</p>;
    return (
      <ul className={styles.list}>
        {query.data.map(complaint => (
          <ComplaintRow
            key={complaint.id}
            complaint={complaint}
            isPending={busyId === complaint.id}
            onApprove={approvable ? () => approveMutation.mutate(complaint.id) : undefined}
            onDelete={() => handleDelete(complaint)}
          />
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.page}>
      <Toast ref={toast} />
      <header className={styles.header}>
        <h1 className={styles.title}>Complaints</h1>
        <p className={styles.subtitle}>
          Nothing is public until it is approved. Anything you would not approve, delete — there is no editing.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Awaiting approval{pending.data ? ` (${pending.data.length})` : ''}</h2>
        {renderList(pending, 'Nothing waiting. Enjoy it while it lasts.', true)}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Approved{approved.data ? ` (${approved.data.length})` : ''}</h2>
        {renderList(approved, 'Nothing approved yet.', false)}
      </section>
    </div>
  );
};

export default ComplaintsAdmin;
