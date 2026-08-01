import type { Schema } from '@/schema';
import { queryOptions } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { BlogPost } from './types';

const clientApiKey = generateClient<Schema>({ authMode: 'apiKey' });

/**
 * Shared so the article page and the editor resolve to one cache entry — and
 * therefore one network request — rather than two definitions of the same query
 * that could drift apart. Mirrors `galleryQueryOptions`.
 */
export const blogPostQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ['blogPost', postId],
    queryFn: async () => {
      const response = await clientApiKey.models.BlogPost.get({ id: postId });
      return response.data as unknown as BlogPost;
    },
  });
