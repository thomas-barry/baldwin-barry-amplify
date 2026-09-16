import { getAdminClient, getPublicClient } from '@/lib/dataClient';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { Complaint, ComplaintStatus, PublicComplaintPage } from './types';

// Public calls go through the API key even when an admin is signed in: the
// custom operations only grant `publicApiKey`, and the default auth mode here
// is the user pool.

export const PAGE_SIZE = 20;

/** Throws the first GraphQL error, which the Amplify client returns rather than throws. */
export const throwOnErrors = (errors: readonly { message: string }[] | undefined) => {
  if (errors?.length) throw new Error(errors[0].message);
};

/** The public wall: approved complaints, newest first, a page at a time. */
export const approvedComplaintsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ['complaints', 'approved'],
    queryFn: async ({ pageParam }) => {
      const { data, errors } = await getPublicClient().queries.listApprovedComplaints({
        limit: PAGE_SIZE,
        nextToken: pageParam,
      });
      throwOnErrors(errors);
      return (data ?? { items: [], nextToken: null }) as PublicComplaintPage;
    },
    initialPageParam: null as string | null,
    // DynamoDB can hand back a token when the remaining rows exactly filled the
    // last page, so an empty page also means there is nothing older.
    getNextPageParam: lastPage => (lastPage.nextToken && lastPage.items.length > 0 ? lastPage.nextToken : undefined),
  });

/**
 * Every complaint in one status, for the admin page and the sidebar badge.
 * Pending reads oldest first (a queue); approved reads newest first (the wall).
 */
export const complaintsByStatusQueryOptions = (status: ComplaintStatus) =>
  queryOptions({
    queryKey: ['complaints', 'admin', status],
    queryFn: async () => {
      const { data, errors } = await getAdminClient().models.Complaint.listComplaintsByStatus(
        { status },
        { sortDirection: status === 'PENDING' ? 'ASC' : 'DESC', limit: 1000 },
      );
      throwOnErrors(errors);
      return data as unknown as Complaint[];
    },
  });
