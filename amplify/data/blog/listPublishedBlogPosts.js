// AppSync JS resolver for `listPublishedBlogPosts`, the public read path for
// musings. See docs/adr/0005-public-reads-are-custom-operations.md.
//
// Uploaded verbatim to the APPSYNC_JS runtime — no throw/try, no regex, no
// imports beyond @aws-appsync/utils. Keep this file self-contained.
import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

export function request(ctx) {
  const limit = Math.min(Math.max(ctx.args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  // A scan's limit counts rows read before the filter, so a page can come back
  // short, or empty, with a nextToken. Callers follow the token to the end.
  return ddb.scan({
    filter: { published: { eq: true } },
    limit,
    nextToken: ctx.args.nextToken ?? null,
  });
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  const items = [];
  for (const item of ctx.result.items) {
    // The filter already excludes drafts; this keeps a filter mistake from
    // publishing one.
    if (item.published === true) {
      items.push(toPublicPost(item));
    }
  }

  return { items, nextToken: ctx.result.nextToken ?? null };
}

// Mapped field by field so the payload can only ever carry these.
function toPublicPost(item) {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    excerpt: item.excerpt ?? null,
    tags: item.tags ?? null,
    publishedDate: item.publishedDate ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt ?? null,
  };
}
