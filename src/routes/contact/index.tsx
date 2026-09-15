import { createFileRoute, redirect } from '@tanstack/react-router';

// The Complaints Department launched at /contact; keep old links working.
export const Route = createFileRoute('/contact/')({
  beforeLoad: () => {
    throw redirect({ to: '/complaints', replace: true });
  },
});
