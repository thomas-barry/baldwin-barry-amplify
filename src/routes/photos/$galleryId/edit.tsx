import GalleryEditor from '@/modules/galleries/components/gallery-editor/GalleryEditor';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/photos/$galleryId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { galleryId } = Route.useParams();
  return <GalleryEditor galleryId={galleryId} />;
}
