import Skeleton from '@/components/Skeleton';
import type { SortValue } from '@/components/SortSelect';
import { useAuth } from '@/context/AuthContext';
import GalleryCard from '@/modules/galleries/components/gallery-card/GalleryCard';
import { Gallery } from '@/modules/galleries/types';
import type { Schema } from '@/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useMemo, useRef } from 'react';
import styles from './GalleryList.module.css';

interface GalleryListProps {
  sort?: SortValue;
}

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });
const clientWrite = generateClient<Schema>({ authMode: 'userPool' });

const SKELETON_COUNT = 6;

const GalleryList = ({ sort = 'newest' }: GalleryListProps) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const toast = useRef<Toast>(null);

  const {
    data: galleries,
    isLoading,
    isError: isErrorQuery,
    error,
    refetch,
  } = useQuery({
    queryKey: ['galleries'],
    queryFn: async () => {
      const response = await clientRead.models.Gallery.list({
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
      return response.data as unknown as Gallery[];
    },
  });

  const sortedGalleries = useMemo(() => {
    if (!galleries) return [];
    const copy = galleries.filter(g => isAdmin || !g.adminOnly);
    if (sort === 'alpha') {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      copy.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    }
    return copy;
  }, [galleries, sort, isAdmin]);

  const deleteMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      const galleryImagesResponse = await clientWrite.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
      });

      if (galleryImagesResponse.data) {
        for (const galleryImage of galleryImagesResponse.data) {
          await clientWrite.models.GalleryImage.delete({ id: galleryImage.id });
        }
      }

      return clientWrite.models.Gallery.delete({ id: galleryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
    onError: error => {
      toast.current?.show({
        severity: 'error',
        summary: 'Delete failed',
        detail: error instanceof Error ? error.message : 'Could not delete the gallery.',
        life: 5000,
      });
    },
  });

  const handleDeleteGallery = (gallery: Gallery) => {
    if (window.confirm(`Are you sure you want to delete "${gallery.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(gallery.id);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.galleryListContainer}>
        <div className={styles.galleryGrid}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div
              key={i}
              className={styles.skeletonCard}>
              <Skeleton
                className={styles.skeletonImage}
                height='auto'
                radius='0'
              />
              <div className={styles.skeletonBody}>
                <Skeleton
                  width='55%'
                  height='1.25rem'
                />
                <Skeleton
                  width='25%'
                  height='0.875rem'
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isErrorQuery) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem', color: 'var(--red-500)' }}
        />
        <p>Error loading galleries: {error?.message || 'Unknown error'}</p>
        <Button
          className={styles.retryButton}
          label='Try again'
          icon='pi pi-refresh'
          outlined
          onClick={() => refetch()}
        />
      </div>
    );
  }

  if (!sortedGalleries.length) {
    return (
      <Card
        className={styles.emptyStateCard}
        title='No Galleries Found'>
        {isAdmin && <p>No galleries yet. Use &quot;New Gallery&quot; to create one.</p>}
      </Card>
    );
  }

  return (
    <div className={styles.galleryListContainer}>
      <Toast ref={toast} />
      <div className={styles.galleryGrid}>
        {sortedGalleries.map(gallery => (
          <GalleryCard
            key={gallery.id}
            gallery={gallery}
            onDelete={handleDeleteGallery}
          />
        ))}
      </div>
    </div>
  );
};

export default GalleryList;
