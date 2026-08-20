import type { Schema } from '@/schema';
import { queryOptions } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Quip } from './types';

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });

/**
 * The rotation: enabled quips only, for the public home page.
 *
 * The hero has a bundled fallback and no acceptable loading state, so it does
 * not need fresh data on every tab focus — which is what the bare `QueryClient`
 * in `main.tsx` would otherwise do. Five minutes is short enough that a quip
 * added in the admin tab appears on the home tab without a reload.
 */
export const rotationQueryOptions = () =>
  queryOptions({
    queryKey: ['quips', 'enabled'],
    queryFn: async () => {
      const response = await clientRead.models.Quip.list({
        filter: { enabled: { eq: true } },
      });
      return response.data as unknown as Quip[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

/** Every quip, enabled or not — the admin page must be able to re-enable one. */
export const allQuipsQueryOptions = () =>
  queryOptions({
    queryKey: ['quips', 'all'],
    queryFn: async () => {
      const response = await clientRead.models.Quip.list();
      return response.data as unknown as Quip[];
    },
  });
