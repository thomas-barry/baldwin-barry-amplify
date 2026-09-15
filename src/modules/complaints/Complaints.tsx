import { iconClass } from '@/components/Icon';
import { useAuth } from '@/context/AuthContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import styles from './Complaints.module.css';
import { ComplaintCard } from './components/complaint-card';
import { ComplaintForm } from './components/complaint-form';
import { approvedComplaintsQueryOptions } from './queries';

const Complaints = () => {
  const { isAdmin } = useAuth();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    approvedComplaintsQueryOptions(),
  );

  const complaints = data?.pages.flatMap(page => page.items) ?? [];
  // Visitors only see this section once there is something in it. Hiding it while loading
  // too stops a heading and spinner flashing up and vanishing when the wall is empty.
  const showOnFile = isAdmin || isError || complaints.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Complaints Department</h1>
      </header>

      <section
        className={styles.section}
        aria-labelledby='file-a-complaint'>
        <h2
          id='file-a-complaint'
          className={styles.sectionHeading}>
          File a complaint
        </h2>
        <p className={styles.note}>
          No account and no email address — just a nickname, if you want one. Complaints are read before they are
          posted, so yours won&apos;t appear straight away.
        </p>
        <ComplaintForm />
      </section>

      {showOnFile && (
        <section
          className={styles.section}
          aria-labelledby='on-file'>
          <h2
            id='on-file'
            className={styles.sectionHeading}>
            On file
          </h2>

          {isLoading && <ProgressSpinner />}

          {isError && (
            <div className={styles.error}>
              <p>The complaints could not be retrieved, which is itself a complaint.</p>
              <Button
                label='Try again'
                icon={iconClass('refresh')}
                onClick={() => refetch()}
              />
            </div>
          )}

          {!isLoading && !isError && complaints.length === 0 && (
            <p className={styles.empty}>No complaints on file. This is statistically improbable.</p>
          )}

          {complaints.length > 0 && (
            <ul className={styles.list}>
              {complaints.map(complaint => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                />
              ))}
            </ul>
          )}

          {hasNextPage && (
            <div className={styles.more}>
              <Button
                label='Load older complaints'
                outlined
                loading={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Complaints;
