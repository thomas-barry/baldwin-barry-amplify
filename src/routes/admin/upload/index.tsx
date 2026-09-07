import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import PhotoUpload from '@/modules/admin/upload/PhotoUpload';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/upload/')({
  component: PhotoUploadPage,
});

function PhotoUploadPage() {
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <PhotoUpload />
    </ProtectedRoute>
  );
}
