import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ImageLibrary from '@/modules/admin/images';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/images/')({
  component: ImageLibraryPage,
});

function ImageLibraryPage() {
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <ImageLibrary />
    </ProtectedRoute>
  );
}
