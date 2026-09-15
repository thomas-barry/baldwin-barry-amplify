import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ComplaintsAdmin from '@/modules/admin/complaints';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/complaints/')({
  component: ComplaintsAdminPage,
});

function ComplaintsAdminPage() {
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <ComplaintsAdmin />
    </ProtectedRoute>
  );
}
