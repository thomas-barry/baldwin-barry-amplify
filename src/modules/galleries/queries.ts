import type { SquareSelection } from '@/components/ImageSquareSelector';
import { getAdminClient, getPublicClient } from '@/lib/dataClient';
import { queryOptions } from '@tanstack/react-query';
import type { Gallery, GalleryPhoto, GalleryView } from './types';

// Visitors read through the public operations, which filter on the server; the
// models themselves are admin-only (docs/adr/0005). Admins read the models so
// they see admin-only and empty galleries too.

/** Throws the first GraphQL error, which the Amplify client returns rather than throws. */
const throwOnErrors = (errors: readonly { message: string }[] | undefined) => {
  if (errors?.length) throw new Error(errors[0].message);
};

/**
 * AWSJSON can arrive parsed, as a JSON string, or double-encoded, depending on
 * the path — the same round-trip `parseExifData` unwraps.
 */
const parseCrop = (raw: unknown): SquareSelection | null => {
  let value = raw;
  for (let depth = 0; depth < 3 && typeof value === 'string'; depth += 1) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' ? (value as SquareSelection) : null;
};

const compareDisplayOrder = (a: GalleryPhoto, b: GalleryPhoto) => {
  if (a.order == null && b.order == null) return 0;
  if (a.order == null) return 1;
  if (b.order == null) return -1;
  if (a.order !== b.order) return a.order - b.order;
  return new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
};

const audience = (isAdmin: boolean) => (isAdmin ? 'admin' : 'public');

/** The gallery grid. Visitors only ever receive visible, non-empty galleries. */
export const galleriesQueryOptions = (isAdmin: boolean) =>
  queryOptions({
    queryKey: ['galleries', audience(isAdmin)],
    queryFn: async (): Promise<Gallery[]> => {
      if (!isAdmin) {
        const { data, errors } = await getPublicClient().queries.listPublicGalleries();
        throwOnErrors(errors);
        return (data ?? []).map(gallery => ({
          ...(gallery as unknown as Gallery),
          thumbnailCrop: parseCrop(gallery.thumbnailCrop),
          images: null,
        }));
      }

      const { data, errors } = await getAdminClient().models.Gallery.list({
        selectionSet: [
          'id',
          'name',
          'description',
          'createdDate',
          'updatedAt',
          'thumbnailImage.*',
          'images.id',
          'thumbnailCrop',
          'adminOnly',
        ],
      });
      throwOnErrors(errors);
      return data.map(gallery => ({
        ...(gallery as unknown as Gallery),
        thumbnailCrop: parseCrop(gallery.thumbnailCrop),
      }));
    },
  });

/**
 * One gallery and its photos in display order. Shared so the gallery page and
 * the Topbar breadcrumb resolve to one cache entry — and therefore one network
 * request — rather than two definitions of the same query that could drift
 * apart. Null when a visitor may not see the gallery.
 */
export const galleryQueryOptions = (galleryId: string, isAdmin: boolean) =>
  queryOptions({
    queryKey: ['gallery', galleryId, audience(isAdmin)],
    queryFn: async (): Promise<GalleryView | null> => {
      if (!isAdmin) {
        const { data, errors } = await getPublicClient().queries.getPublicGallery({ id: galleryId });
        throwOnErrors(errors);
        if (!data) return null;
        return {
          gallery: { ...(data as unknown as Gallery), thumbnailCrop: parseCrop(data.thumbnailCrop), images: null },
          // Already ordered by the server.
          images: (data.images ?? []) as unknown as GalleryPhoto[],
        };
      }

      const [galleryResponse, imagesResponse] = await Promise.all([
        getAdminClient().models.Gallery.get({ id: galleryId }),
        getAdminClient().models.GalleryImage.list({
          filter: { galleryId: { eq: galleryId } },
          selectionSet: ['id', 'galleryId', 'imageId', 'addedDate', 'order', 'image.*'],
        }),
      ]);
      throwOnErrors(galleryResponse.errors);
      throwOnErrors(imagesResponse.errors);
      if (!galleryResponse.data) return null;

      return {
        gallery: {
          ...(galleryResponse.data as unknown as Gallery),
          thumbnailCrop: parseCrop(galleryResponse.data.thumbnailCrop),
        },
        images: (imagesResponse.data.filter(item => item.image != null) as unknown as GalleryPhoto[]).sort(
          compareDisplayOrder,
        ),
      };
    },
  });
