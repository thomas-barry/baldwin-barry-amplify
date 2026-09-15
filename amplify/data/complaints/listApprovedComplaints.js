// AppSync JS resolver for `listApprovedComplaints`, the only public read path
// for a Complaint. See docs/adr/0003-complaints-api-is-custom-operations.md.
//
// Uploaded verbatim to the APPSYNC_JS runtime — see submitComplaint.js for what
// that rules out. Keep this file self-contained.
import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function request(ctx) {
  const limit = Math.min(Math.max(ctx.args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  // The status partition is what keeps pending complaints out: this query can
  // only ever see APPROVED rows. Descending on submittedAt gives newest first.
  return ddb.query({
    index: 'complaintsByStatus',
    query: { status: { eq: 'APPROVED' } },
    scanIndexForward: false,
    limit,
    nextToken: ctx.args.nextToken ?? null,
  });
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Mapped field by field so the public payload can only ever carry these.
  // `submittedOn` is the date alone: the page shows only the day, and an exact
  // timestamp would let anyone who knows when a friend visited identify their
  // complaint — so it never leaves the table. The response goes out as text
  // alone; `respondedAt` stays admin-side.
  const items = [];
  for (const item of ctx.result.items) {
    items.push({
      id: item.id,
      text: item.text,
      nickname: item.nickname ?? null,
      dissatisfaction: item.dissatisfaction,
      submittedOn: item.submittedAt.slice(0, 10),
      response: item.response ?? null,
    });
  }

  return { items, nextToken: ctx.result.nextToken ?? null };
}
