import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import GalleryEditor from '@/modules/galleries/components/gallery-editor/GalleryEditor';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/photos/$galleryId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { galleryId } = Route.useParams();
  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/'>
      <GalleryEditor galleryId={galleryId} />
    </ProtectedRoute>
  );
}
