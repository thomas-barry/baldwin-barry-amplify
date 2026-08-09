import PlaidOAuth from '@/modules/barryfi/PlaidOAuth';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/barryfi/plaid-oauth')({
  component: PlaidOAuth,
});
