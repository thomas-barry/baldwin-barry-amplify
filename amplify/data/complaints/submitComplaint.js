// AppSync JS resolver for `submitComplaint`, the only public write path for a
// Complaint. See docs/adr/0003-complaints-api-is-custom-operations.md.
//
// This file is uploaded to AppSync verbatim — no bundler, no TypeScript — and
// runs in the APPSYNC_JS runtime, which has no `throw`, `try`, regex or classic
// `for` loop. Errors go through `util.error`. It must stay self-contained: the
// only importable modules are the ones AppSync provides.
import { runtime, util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

const TEXT_MIN = 10;
const TEXT_MAX = 1000;
const NICKNAME_MAX = 40;
const DISSATISFACTION_MIN = 1;
const DISSATISFACTION_MAX = 11;

export function request(ctx) {
  const { text, nickname, dissatisfaction, website } = ctx.args;

  // Honeypot. A person never sees this field; a form-filling bot does. It gets
  // the same answer a real submission gets, and nothing is written.
  if (website) {
    // earlyReturn leaves this step only; notifyComplaint.js checks the flag.
    ctx.stash.skipNotify = true;
    runtime.earlyReturn(true);
  }

  const trimmedText = (text ?? '').trim();
  if (trimmedText.length < TEXT_MIN || trimmedText.length > TEXT_MAX) {
    util.error(`A complaint must be between ${TEXT_MIN} and ${TEXT_MAX} characters.`, 'ValidationError');
  }

  const trimmedNickname = (nickname ?? '').trim();
  if (trimmedNickname.length > NICKNAME_MAX) {
    util.error(`A nickname can be at most ${NICKNAME_MAX} characters.`, 'ValidationError');
  }

  // GraphQL `Int!` already guarantees a whole number; only the range is ours.
  if (dissatisfaction < DISSATISFACTION_MIN || dissatisfaction > DISSATISFACTION_MAX) {
    util.error(`Dissatisfaction must be between ${DISSATISFACTION_MIN} and ${DISSATISFACTION_MAX}.`, 'ValidationError');
  }

  // Written here rather than by Amplify's model resolvers, which this bypasses,
  // so createdAt/updatedAt/__typename are ours to set. The admin page reads
  // these rows through the generated model API and expects all three.
  const now = util.time.nowISO8601();
  const id = util.autoId();

  // For notifyComplaint.js, the next step in the pipeline.
  ctx.stash.complaint = {
    nickname: trimmedNickname === '' ? null : trimmedNickname,
    dissatisfaction,
  };

  return ddb.put({
    key: { id },
    item: {
      __typename: 'Complaint',
      text: trimmedText,
      // Blank is stored as absent, not as "Anonymous" — that is a display rule.
      nickname: trimmedNickname === '' ? null : trimmedNickname,
      dissatisfaction,
      // Forced, whatever the caller sent: this is what makes approval mean anything.
      status: 'PENDING',
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    condition: { id: { attributeExists: false } },
  });
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  // Deliberately returns nothing about the stored row: not the id, not the
  // timestamp. The complainant has no use for either, and no way to look the
  // complaint up again.
  return true;
}
