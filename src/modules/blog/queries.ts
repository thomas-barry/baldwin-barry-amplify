import type { Schema } from '@/schema';
import { queryOptions } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { BlogPost } from './types';

// Visitors read through the public operations, which never return drafts; the
// model itself is admin-only (docs/adr/0005). Admins read the model so they
// see drafts too.
const clientPublic = generateClient<Schema>({ authMode: 'apiKey' });
const clientAdmin = generateClient<Schema>({ authMode: 'userPool' });

/** Throws the first GraphQL error, which the Amplify client returns rather than throws. */
const throwOnErrors = (errors: readonly { message: string }[] | undefined) => {
  if (errors?.length) throw new Error(errors[0].message);
};

const audience = (isAdmin: boolean) => (isAdmin ? 'admin' : 'public');

/** Every public operation result is published by definition. */
const fromPublic = (post: NonNullable<Schema['PublicBlogPost']['type']>): BlogPost => ({
  ...post,
  excerpt: post.excerpt ?? null,
  tags: post.tags ?? null,
  publishedDate: post.publishedDate ?? null,
  updatedAt: post.updatedAt ?? null,
  published: true,
});

export const blogPostsQueryOptions = (isAdmin: boolean) =>
  queryOptions({
    queryKey: ['blogPosts', audience(isAdmin)],
    queryFn: async (): Promise<BlogPost[]> => {
      if (isAdmin) {
        const { data, errors } = await clientAdmin.models.BlogPost.list({ limit: 1000 });
        throwOnErrors(errors);
        return data as unknown as BlogPost[];
      }

      // The resolver scans, so a page can be short or empty and still carry a
      // token. Follow it to the end.
      const posts: BlogPost[] = [];
      let nextToken: string | null = null;
      do {
        const response: Awaited<ReturnType<typeof clientPublic.queries.listPublishedBlogPosts>> =
          await clientPublic.queries.listPublishedBlogPosts({ nextToken });
        throwOnErrors(response.errors);
        posts.push(...(response.data?.items ?? []).map(fromPublic));
        nextToken = response.data?.nextToken ?? null;
      } while (nextToken);
      return posts;
    },
  });

/**
 * Shared so the article page and the editor resolve to one cache entry — and
 * therefore one network request — rather than two definitions of the same query
 * that could drift apart. Mirrors `galleryQueryOptions`. Null for a draft when
 * the reader is not an admin.
 */
export const blogPostQueryOptions = (postId: string, isAdmin: boolean) =>
  queryOptions({
    queryKey: ['blogPost', postId, audience(isAdmin)],
    queryFn: async (): Promise<BlogPost | null> => {
      if (isAdmin) {
        const { data, errors } = await clientAdmin.models.BlogPost.get({ id: postId });
        throwOnErrors(errors);
        return data as unknown as BlogPost | null;
      }

      const { data, errors } = await clientPublic.queries.getPublishedBlogPost({ id: postId });
      throwOnErrors(errors);
      return data ? fromPublic(data) : null;
    },
  });
