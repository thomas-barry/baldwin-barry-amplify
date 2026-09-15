// AppSync JS resolver for `getPublishedBlogPost`. A draft reads exactly like a
// post that does not exist. See docs/adr/0005-public-reads-are-custom-operations.md.
//
// Uploaded verbatim to the APPSYNC_JS runtime — see listPublishedBlogPosts.js.
import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

export function request(ctx) {
  return ddb.get({ key: { id: ctx.args.id } });
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result;
  if (!item || item.published !== true) {
    return null;
  }

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
