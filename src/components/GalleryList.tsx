import type { SortValue } from '@/components/SortSelect';
import { useAuth } from '@/context/AuthContext';
import GalleryCard from '@/modules/galleries/components/gallery-card/GalleryCard';
import { Gallery } from '@/modules/galleries/types';
import type { Schema } from '@/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useMemo } from 'react';
import styles from './GalleryList.module.css';

interface GalleryListProps {
  sort?: SortValue;
}

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });
const clientWrite = generateClient<Schema>({ authMode: 'userPool' });

const GalleryList = ({ sort = 'newest' }: GalleryListProps) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const {
    data: galleries,
    isLoading,
    isError: isErrorQuery,
    error,
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
      console.error('Error deleting gallery:', error);
    },
  });

  const handleDeleteGallery = (gallery: Gallery) => {
    if (window.confirm(`Are you sure you want to delete "${gallery.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(gallery.id);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <ProgressSpinner />
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
      </div>
    );
  }

  if (!sortedGalleries.length) {
    return (
      <Card
        className={styles.emptyStateCard}
        title='No Galleries Found'>
        <p>No galleries have been created yet. Use the "Create New Gallery" button to add one.</p>
      </Card>
    );
  }

  return (
    <div className={styles.galleryListContainer}>
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
