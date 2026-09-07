import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import type { Schema } from '../../data/resource';

const client = new CloudWatchLogsClient();

const DEFAULT_MINUTES = 60;
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

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
  const logGroupName = process.env.UPLOAD_LOG_GROUP_NAME;
  if (!logGroupName) {
    throw new Error('UPLOAD_LOG_GROUP_NAME environment variable is not set');
  }

  const minutes = event.arguments.minutes ?? DEFAULT_MINUTES;
  const limit = Math.min(event.arguments.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const filterPattern = event.arguments.filterPattern ?? undefined;

  const response = await client.send(
    new FilterLogEventsCommand({
      logGroupName,
      startTime: Date.now() - minutes * 60 * 1000,
      limit,
      // An empty string is a valid-but-useless pattern to CloudWatch, so send
      // undefined rather than let a cleared search box match nothing.
      filterPattern: filterPattern?.trim() ? filterPattern : undefined,
    }),
  );

  return (response.events ?? []).map(e => parseEntry(e.message ?? '', e.timestamp));
};
