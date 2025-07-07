import Gallery from '@/modules/galleries/components/gallery/Gallery';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/galleries/$galleryId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { galleryId } = Route.useParams();
  return <Gallery galleryId={galleryId} />;
}
