import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import type { Schema } from '../../../../../amplify/data/resource';
import AmplifyFileUploader from '../amplify-file-uploader/AmplifyFileUploader';
import PhotoCarousel, { type PhotoCarouselHandle } from '../photo-carousel/PhotoCarousel';
import styles from './Gallery.module.css';

const clientApiKey = generateClient<Schema>({ authMode: 'apiKey' });

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const toast = useRef<Toast>(null);
  const carouselRef = useRef<PhotoCarouselHandle>(null);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

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

  const onUploadSuccess = async (event: { key?: string; fileType?: string }) => {
    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) throw new Error('User must be authenticated to upload images');
      if (!event.key) throw new Error('Upload succeeded but no file key was returned');

      queryClient.invalidateQueries({ queryKey: ['galleryImages', galleryId] });
      toast.current?.show({
        severity: 'success',
        summary: 'Upload Complete',
        detail: 'Image uploaded and added to gallery',
        life: 3000,
      });
    } catch (error) {
      console.error('Error creating image records:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Record Creation Failed',
        detail: error instanceof Error ? error.message : 'Failed to create image records',
        life: 5000,
      });
    }
  };

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
            <i className='pi pi-play' />
            Slideshow
          </button>
          {isAdmin && (
            <Link
              to='/photos/$galleryId/edit'
              params={{ galleryId }}
              className={styles.galleryEditLink}
            >
              <Button icon='pi pi-pencil' size='small' severity='info' aria-label='Edit Gallery' />
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
        <AmplifyFileUploader onUploadSuccess={onUploadSuccess} galleryId={galleryId} />
      )}

      <PhotoCarousel
        ref={carouselRef}
        galleryImages={galleryImages ?? []}
        isLoading={isLoading}
      />

      <Toast ref={toast} />
    </div>
  );
};

export default Gallery;
