import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { GetFunctionConfigurationCommand, LambdaClient, ResourceNotFoundException } from '@aws-sdk/client-lambda';
import type { Schema } from '../../data/resource';

const client = new CloudWatchLogsClient();
const lambdaClient = new LambdaClient();

// Both functions are deployed by the same Amplify stack, so they share a name
// prefix (`amplify-<app>-<branch>-`). Deriving the upload handler's log group
// from this function's own name keeps the CDK graph acyclic — referencing the
// construct directly would make data -> readUploadLogs -> onUploadHandler ->
// data, which CloudFormation rejects.
const SELF_MARKER = 'readUploadLogs';
const TARGET_MARKER = 'onUploadHandler';

// Deleting a Lambda leaves its log group behind, so a sandbox that has been
// torn down and recreated a few times accumulates several matching groups —
// only one of which belongs to a function that still exists. The log group name
// carries no signal about which: DescribeLogGroups returns them name-ascending,
// which is why taking `logGroups[0]` served logs from a function deleted in
// 2025. Ask Lambda instead — a deleted function 404s, and that is not a
// heuristic that can be wrong.
async function functionExists(logGroupName: string): Promise<boolean> {
  const functionName = logGroupName.replace('/aws/lambda/', '');
  try {
    await lambdaClient.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) return false;
    throw error;
  }
}

let cachedLogGroupName: string | undefined;

async function resolveUploadLogGroup(): Promise<string> {
  if (cachedLogGroupName) return cachedLogGroupName;

  const selfName = process.env.AWS_LAMBDA_FUNCTION_NAME ?? '';
  const markerAt = selfName.indexOf(SELF_MARKER);
  const stackPrefix = markerAt > 0 ? selfName.slice(0, markerAt) : '';

  const response = await client.send(
    new DescribeLogGroupsCommand({
      logGroupNamePrefix: `/aws/lambda/${stackPrefix}${TARGET_MARKER}`,
    }),
  );

  const candidates = response.logGroups ?? [];
  const live: typeof candidates = [];
  for (const group of candidates) {
    if (group.logGroupName && (await functionExists(group.logGroupName))) live.push(group);
  }

  // More than one live match is not expected, but the tie-break must be
  // deliberate rather than whatever order CloudWatch happened to return —
  // which is name-ascending, and says nothing about which function is current.
  // DescribeLogGroups exposes no last-event time (that lives on log *streams*),
  // so newest-created wins: a redeployed function gets a fresh group.
  live.sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0));

  const found = live[0]?.logGroupName;
  if (!found) {
    // Deliberately not cached: the next invocation must retry, or a lookup that
    // ran while the stack was mid-deploy would poison the container for its
    // whole lifetime.
    throw new Error(
      `No live ${TARGET_MARKER} function found under prefix "${stackPrefix}" ` +
        `(${candidates.length} orphaned log group(s) ignored).`,
    );
  }

  console.log(
    `resolved upload log group: ${found}` +
      (candidates.length > live.length
        ? ` (ignored ${candidates.length - live.length} orphaned group(s): ${candidates
            .filter(g => !live.includes(g))
            .map(g => g.logGroupName)
            .join(', ')})`
        : ''),
  );

  cachedLogGroupName = found;
  return found;
}

const DEFAULT_MINUTES = 60;
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;
// FilterLogEvents scans log streams rather than a flat index, so a page can
// come back empty and still carry a continuation token — most often with a
// filter pattern over a wide window, where matches are sparse. That makes the
// event count non-monotonic, so the loop needs a page ceiling as well as a
// length one or it can spend the whole 30s timeout on empty pages.
const MAX_PAGES = 20;

// Lambda writes application logs as tab-separated
// `<iso timestamp>\t<request id>\t<level>\t<message>`, and platform lines
// (START/END/REPORT/INIT_START) as bare text. They need different parsing.
const APP_LINE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\t([0-9a-f-]{36})\t(\w+)\t([\s\S]*)$/;
const PLATFORM_LINE = /^(START|END|REPORT|INIT_START)\b/;
const REQUEST_ID = /RequestId:\s*([0-9a-f-]{36})/;
// The field that actually diagnoses a failed upload — no application log ever
// records that the invocation ran out of wall clock.
const REPORT_STATUS = /Status:\s*(\w+)/;

interface ParsedEntry {
  timestamp: string;
  requestId: string;
  level: string;
  message: string;
  status: string;
}

function parseEntry(message: string, eventTimestamp: number | undefined): ParsedEntry {
  const raw = message.replace(/\s+$/, '');
  const fallbackTime = new Date(eventTimestamp ?? Date.now()).toISOString();

  const app = APP_LINE.exec(raw);
  if (app) {
    return { timestamp: app[1], requestId: app[2], level: app[3], message: app[4], status: '' };
  }

  const platform = PLATFORM_LINE.exec(raw);
  if (platform) {
    const kind = platform[1];
    return {
      timestamp: fallbackTime,
      requestId: REQUEST_ID.exec(raw)?.[1] ?? '',
      level: kind,
      message: raw,
      // Only REPORT carries a Status, and only when the invocation did not
      // exit cleanly — a successful run omits the field entirely.
      status: kind === 'REPORT' ? (REPORT_STATUS.exec(raw)?.[1] ?? 'ok') : '',
    };
  }

  return { timestamp: fallbackTime, requestId: '', level: 'INFO', message: raw, status: '' };
}

export const handler: Schema['readUploadLogs']['functionHandler'] = async event => {
  const logGroupName = await resolveUploadLogGroup();

  const minutes = event.arguments.minutes ?? DEFAULT_MINUTES;
  // Clamped at both ends: this is a public GraphQL argument, and a 0 or
  // negative limit would make the paging loop ask CloudWatch for 0 events.
  const limit = Math.min(Math.max(event.arguments.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filterPattern = event.arguments.filterPattern ?? undefined;

  console.log(`reading ${logGroupName} for the last ${minutes} minute(s), limit ${limit}`);

  const startTime = Date.now() - minutes * 60 * 1000;
  const events: FilteredLogEvent[] = [];
  let nextToken: string | undefined;
  let pages = 0;

  do {
    const response = await client.send(
      new FilterLogEventsCommand({
        logGroupName,
        startTime,
        // Ask only for what is still missing: `limit` is a per-call ceiling, so
        // passing the full target on every page would overshoot it.
        limit: limit - events.length,
        // An empty string is a valid-but-useless pattern to CloudWatch, so send
        // undefined rather than let a cleared search box match nothing.
        filterPattern: filterPattern?.trim() ? filterPattern : undefined,
        nextToken,
      }),
    );

    events.push(...(response.events ?? []));
    nextToken = response.nextToken;
    pages += 1;
  } while (nextToken && events.length < limit && pages < MAX_PAGES);

  if (nextToken) {
    console.warn(
      `stopped with more events available: ${events.length} event(s) over ${pages} page(s) ` +
        `(${events.length >= limit ? `limit ${limit} reached` : `page cap ${MAX_PAGES} reached`}).`,
    );
  }

  console.log(`returned ${events.length} event(s) over ${pages} page(s)`);
  return events.map(e => parseEntry(e.message ?? '', e.timestamp));
};
