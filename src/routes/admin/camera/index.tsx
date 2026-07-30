import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import CameraUpload from '@/modules/admin/camera/CameraUpload';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/camera/')({
  component: CameraUploadPage,
});

function CameraUploadPage() {
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <CameraUpload />
    </ProtectedRoute>
  );
}
