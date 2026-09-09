import { iconClass } from '@/components/Icon';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useMemo, useState } from 'react';
import styles from './UploadLogs.module.css';

// userPool rather than apiKey: the query is authorised to the admin group, so
// it has to travel with the signed-in user's token.
const client = generateClient<Schema>({ authMode: 'userPool' });

type LogEntry = NonNullable<Schema['readUploadLogs']['returnType']>[number];

interface Invocation {
  requestId: string;
  startedAt: string;
  status: string;
  entries: NonNullable<LogEntry>[];
}

// Sent explicitly rather than left to the handler's default, so the page can
// tell a full result from a capped one. CloudWatch has no cheap total, so
// "exactly the cap" is the only signal available without a schema change.
const EVENT_LIMIT = 300;

const RANGE_OPTIONS = [
  { label: 'Last 15 minutes', value: 15 },
  { label: 'Last hour', value: 60 },
  { label: 'Last 6 hours', value: 360 },
  { label: 'Last 24 hours', value: 1440 },
];

// A timed-out invocation is the failure mode that matters most here, and it is
// only ever visible on the REPORT line.
const isFailure = (status: string) => status !== '' && status !== 'ok';

const UploadLogs = () => {
  const [minutes, setMinutes] = useState(60);
  const [filterPattern, setFilterPattern] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const {
    data: entries,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['uploadLogs', minutes, appliedFilter],
    queryFn: async (): Promise<NonNullable<LogEntry>[]> => {
      const response = await client.queries.readUploadLogs({
        minutes,
        limit: EVENT_LIMIT,
        filterPattern: appliedFilter || undefined,
      });
      if (response.errors?.length) {
        throw new Error(response.errors.map(e => e.message).join('; '));
      }
      return (response.data ?? []).filter((e): e is NonNullable<LogEntry> => e !== null);
    },
  });

  // Each invocation emits ~15 lines, so a busy 24-hour window hits the cap long
  // before it runs out of history.
  const truncated = (entries?.length ?? 0) >= EVENT_LIMIT;

  // CloudWatch returns a flat stream. Grouping by request id is what turns
  // "three timeouts" back into "one file S3 retried three times".
  const invocations = useMemo<Invocation[]>(() => {
    const byRequest = new Map<string, Invocation>();
    for (const entry of entries ?? []) {
      const requestId = entry.requestId || 'unattributed';
      let invocation = byRequest.get(requestId);
      if (!invocation) {
        invocation = { requestId, startedAt: entry.timestamp ?? '', status: '', entries: [] };
        byRequest.set(requestId, invocation);
      }
      invocation.entries.push(entry);
      if (entry.status) invocation.status = entry.status;
    }
    return [...byRequest.values()].reverse();
  }, [entries]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Upload Logs</h1>
      <p className={styles.subhead}>CloudWatch output from the image upload Lambda, newest invocation first.</p>

      <div className={styles.controls}>
        <Dropdown
          value={minutes}
          options={RANGE_OPTIONS}
          onChange={e => setMinutes(e.value)}
          className={styles.range}
        />
        <InputText
          value={filterPattern}
          onChange={e => setFilterPattern(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setAppliedFilter(filterPattern)}
          placeholder='Filter (e.g. timeout)'
          className={styles.filter}
        />
        <Button
          label='Search'
          icon={iconClass('search')}
          onClick={() => setAppliedFilter(filterPattern)}
          disabled={isFetching}
        />
        <Button
          icon={isFetching ? iconClass('spinner', { spin: true }) : iconClass('refresh')}
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label='Refresh'
          outlined
        />
      </div>

      {error && (
        <Message
          severity='error'
          text={error instanceof Error ? error.message : 'Could not load logs'}
          className={styles.error}
        />
      )}

      {truncated && (
        <Message
          severity='warn'
          text={`Showing the first ${EVENT_LIMIT} log events in this window — there may be more. Narrow the time range or add a filter.`}
          className={styles.error}
        />
      )}

      {isLoading ? (
        <ProgressSpinner />
      ) : invocations.length === 0 ? (
        <p className={styles.empty}>
          The upload handler logged nothing in the last {minutes} minutes.
          {appliedFilter && ' Try clearing the filter pattern.'}
        </p>
      ) : (
        <ul className={styles.invocations}>
          {invocations.map(invocation => (
            <li
              key={invocation.requestId + invocation.startedAt}
              className={`${styles.invocation} ${isFailure(invocation.status) ? styles.failed : ''}`}>
              <header className={styles.invocationHeader}>
                <code className={styles.requestId}>{invocation.requestId}</code>
                {invocation.status && (
                  <span className={isFailure(invocation.status) ? styles.badgeFail : styles.badgeOk}>
                    {invocation.status}
                  </span>
                )}
              </header>
              <ol className={styles.entries}>
                {invocation.entries.map((entry, i) => (
                  <li
                    key={i}
                    className={styles.entry}>
                    <span className={styles.time}>{(entry.timestamp ?? '').slice(11, 23)}</span>
                    <span className={styles.level}>{entry.level}</span>
                    <pre className={styles.message}>{entry.message}</pre>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UploadLogs;
