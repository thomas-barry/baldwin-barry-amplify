import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import QuipsAdmin from '@/modules/admin/quips';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/quips/')({
  component: QuipsAdminPage,
});

function QuipsAdminPage() {
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <QuipsAdmin />
    </ProtectedRoute>
  );
}
