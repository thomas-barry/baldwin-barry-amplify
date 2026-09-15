// Second step of the `submitComplaint` pipeline: tells the site owner a
// complaint is waiting, by publishing to an SNS topic through a SigV4-signed
// HTTP data source. See docs/adr/0004-complaint-notifications-publish-from-the-resolver.md.
//
// Uploaded verbatim to the APPSYNC_JS runtime, like submitComplaint.js: no
// `throw`/`try`, no regex, no passing functions as arguments, and no imports
// beyond @aws-appsync/utils. Self-contained on purpose.
import { runtime, util } from '@aws-appsync/utils';

// Mirrors src/modules/complaints/dissatisfaction.ts, which this file cannot
// import. Change both together.
const DISSATISFACTION_MIN = 1;
const DISSATISFACTION_MAX = 11;
const DISSATISFACTION_LABELS = [
  'Miffed',
  'Peeved',
  'Irked',
  'Vexed',
  'Cross',
  'Aggrieved',
  'Indignant',
  'Fuming',
  'Seething',
  'Livid',
  'Incandescent',
];

export function request(ctx) {
  // Set by submitComplaint.js for honeypot hits. Its early return only leaves
  // that step, not the pipeline, so without this every bot would email you.
  if (ctx.stash.skipNotify) {
    runtime.earlyReturn(ctx.prev.result);
  }

  const topicArn = ctx.env.COMPLAINT_TOPIC_ARN;
  if (!topicArn) {
    console.error('COMPLAINT_TOPIC_ARN is not set; skipping complaint notification.');
    runtime.earlyReturn(ctx.prev.result);
  }

  const { nickname, dissatisfaction } = ctx.stash.complaint;
  const label = DISSATISFACTION_LABELS[dissatisfaction - DISSATISFACTION_MIN];
  const reviewUrl = ctx.env.COMPLAINT_REVIEW_URL;

  // A heads-up only. The complaint text is deliberately left out: complainants
  // may paste other people's details, and an email copy can't be moderated away.
  const lines = [
    'A new complaint is waiting for approval.',
    '',
    `From: ${nickname ?? 'Anonymous'}`,
    `Dissatisfaction: ${dissatisfaction}/${DISSATISFACTION_MAX} · ${label}`,
    '',
    reviewUrl ? `Review it: ${reviewUrl}` : 'Review it in the admin Complaint Queue.',
  ];

  // SNS rejects non-ASCII and line breaks in Subject, and the nickname is
  // user-controlled, so the subject stays fixed.
  const params = [
    ['Action', 'Publish'],
    ['Version', '2010-03-31'],
    ['TopicArn', topicArn],
    ['Subject', 'New complaint awaiting approval'],
    ['Message', lines.join('\n')],
  ];
  const pairs = [];
  for (const [key, value] of params) {
    pairs.push(`${key}=${util.urlEncode(value)}`);
  }

  return {
    version: '2018-05-29',
    method: 'POST',
    resourcePath: '/',
    params: {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: pairs.join('&'),
    },
  };
}

export function response(ctx) {
  // The complaint is already stored by now. A failed notification is logged
  // but never reported to the caller: the form treats any GraphQL error as a
  // failed submission, which would invite a duplicate. The admin badge still
  // shows the complaint.
  if (ctx.error) {
    console.error(`Complaint notification failed: ${ctx.error.message}`);
  } else if (ctx.result.statusCode !== 200) {
    console.error(`Complaint notification failed: SNS returned ${ctx.result.statusCode}: ${ctx.result.body}`);
  }
  return ctx.prev.result;
}
