import type { Schema } from '@/schema';
import { queryOptions } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';

const clientApiKey = generateClient<Schema>({ authMode: 'apiKey' });

/**
 * Shared so the gallery page and the Topbar breadcrumb resolve to one cache
 * entry — and therefore one network request — rather than two definitions of
 * the same query that could drift apart.
 */
export const galleryQueryOptions = (galleryId: string) =>
  queryOptions({
    queryKey: ['gallery', galleryId],
    queryFn: async () => {
      const response = await clientApiKey.models.Gallery.get({ id: galleryId });
      return response.data;
    },
  });
