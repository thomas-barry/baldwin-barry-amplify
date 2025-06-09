import GalleryCard from '@/modules/galleries/components/gallery-card/GalleryCard';
import { Gallery } from '@/modules/galleries/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import type { Schema } from '../../amplify/data/resource';
import styles from './GalleryList.module.css';

const GalleryList = () => {
  // Generate the client for our Amplify data models
  const client = generateClient<Schema>();
  const queryClient = useQueryClient();

  const {
    data: galleries,
    isLoading,
    isError: isErrorQuery,
  } = useQuery({
    queryKey: ['galleries'],
    queryFn: async () => {
      const response = await client.models.Gallery.list();
      const allGalleries = response.data;
      if (!allGalleries) {
        return null;
      }
      return allGalleries;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      const response = await client.models.Gallery.delete({ id: galleryId });
      return response;
    },
    onSuccess: () => {
      // Refetch the galleries list after successful deletion
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
    onError: error => {
      console.error('Error deleting gallery:', error);
      // You could add a toast notification here if you have a toast library
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
          style={{ fontSize: '2rem', color: 'var(--red-500)' }}></i>
        <p>Error: {isErrorQuery}</p>
      </div>
    );
  }

  if (!galleries?.length) {
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
        {galleries.map(gallery => (
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
