import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { useRef } from 'react';
import type { Schema } from '@/schema';
import PhotoCarousel, { type PhotoCarouselHandle } from '../photo-carousel/PhotoCarousel';
import styles from './Gallery.module.css';

const clientApiKey = generateClient<Schema>({ authMode: 'apiKey' });

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const carouselRef = useRef<PhotoCarouselHandle>(null);
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

  const { data: gallery, isLoading: isGalleryLoading } = useQuery({
    queryKey: ['gallery', galleryId],
    queryFn: async () => {
      const response = await clientApiKey.models.Gallery.get({ id: galleryId });
      return response.data;
    },
  });

  return (
    <div>
      <div className={styles.galleryHeader}>
        <div className={styles.galleryTitleBlock}>
          <h2 className={styles.galleryHeading}>
            {isGalleryLoading ? 'Loading…' : (gallery?.name ?? 'Gallery')}
          </h2>
          {gallery?.description && (
            <p className={styles.galleryDescription}>{gallery.description}</p>
          )}
        </div>
        <div className={styles.galleryHeaderActions}>
          <button
            className={styles.slideshowBtn}
            onClick={() => carouselRef.current?.play()}
            aria-label='Start slideshow'
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
              <polygon points="3,1.5 11.5,6.5 3,11.5" />
            </svg>
            Slideshow
          </button>
          {isAdmin && (
            <Link
              to='/photos/$galleryId/edit'
              params={{ galleryId }}
              className='p-button p-component p-button-icon-only p-button-sm p-button-info'
              aria-label='Edit Gallery'
            >
              <span className='p-button-icon pi pi-pencil' aria-hidden='true' />
            </Link>
          )}
        </div>
      </div>

      <PhotoCarousel
        ref={carouselRef}
        galleryImages={galleryImages ?? []}
        isLoading={isLoading}
      />

    </div>
  );
};

export default Gallery;
