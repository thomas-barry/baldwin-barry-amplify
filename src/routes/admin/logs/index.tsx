import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import UploadLogs from '@/modules/admin/logs/UploadLogs';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/logs/')({
  component: UploadLogsPage,
});

function UploadLogsPage() {
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <UploadLogs />
    </ProtectedRoute>
  );
}
