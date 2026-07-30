import { useAuth } from '@/context/AuthContext';
import { galleryQueryOptions } from '@/modules/galleries/queries';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import PhotoCarousel from '../photo-carousel/PhotoCarousel';
import styles from './Gallery.module.css';

const clientApiKey = generateClient<Schema>({ authMode: 'apiKey' });

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const { isAdmin } = useAuth();

  const { data: galleryImages, isLoading } = useQuery({
    queryKey: ['galleryImages', galleryId],
    queryFn: async () => {
      const response = await clientApiKey.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
        selectionSet: ['id', 'galleryId', 'imageId', 'addedDate', 'order', 'image.*'],
      });

      return response.data?.sort((a, b) => {
        if (a.order === null && b.order === null) return 0;
        if (a.order === null) return 1;
        if (b.order === null) return -1;
        if (a.order !== b.order) return a.order - b.order;
        return new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
      });
    },
  });

  // Shared with the Topbar breadcrumb — see galleryQueryOptions.
  const { data: gallery, isLoading: isGalleryLoading } = useQuery(galleryQueryOptions(galleryId));

  return (
    <div>
      <div className={styles.galleryHeader}>
        <div className={styles.galleryTitleBlock}>
          <h2 className={styles.galleryHeading}>{isGalleryLoading ? 'Loading…' : (gallery?.name ?? 'Gallery')}</h2>
          {gallery?.description && <p className={styles.galleryDescription}>{gallery.description}</p>}
        </div>
        <div className={styles.galleryHeaderActions}>
          <Link
            to='/photos'
            className='p-button p-component p-button-secondary'>
            <span
              className='p-button-icon pi pi-arrow-left p-button-icon-left'
              aria-hidden='true'
            />
            <span className='p-button-label'>Galleries</span>
          </Link>
          {isAdmin && (
            <Link
              to='/photos/$galleryId/edit'
              params={{ galleryId }}
              className='p-button p-component p-button-info'
              aria-label='Edit Gallery'>
              <span
                className='p-button-icon pi pi-pencil'
                aria-hidden='true'
              />
            </Link>
          )}
        </div>
      </div>

      <PhotoCarousel
        galleryImages={galleryImages ?? []}
        isLoading={isLoading}
      />
    </div>
  );
};

export default Gallery;
