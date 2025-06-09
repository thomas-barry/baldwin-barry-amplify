import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import type { Schema } from '../../amplify/data/resource';
import GalleryDetail from './GalleryDetail';
import styles from './GalleryList.module.css';

export interface Gallery {
  id: string;
  name: string;
  description: string | null;
  createdDate: string;
}

interface GalleryListProps {
  refreshTrigger?: number; // Optional prop to trigger refresh
}

interface SortOption {
  label: string;
  value: string;
  direction: 'asc' | 'desc';
}

const sortOptions: SortOption[] = [
  { label: 'Newest First', value: 'createdDate', direction: 'desc' },
  { label: 'Oldest First', value: 'createdDate', direction: 'asc' },
  { label: 'Name (A-Z)', value: 'name', direction: 'asc' },
  { label: 'Name (Z-A)', value: 'name', direction: 'desc' },
];

const GalleryList = ({ refreshTrigger = 0 }: GalleryListProps) => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [detailDialogVisible, setDetailDialogVisible] = useState(false);
  const toast = useRef<Toast>(null);

  // Generate the client for our Amplify data models
  const client = generateClient<Schema>();

  // Handler for deleting a gallery
  const handleDeleteGallery = (galleryId: string) => {
    confirmDialog({
      message: 'Are you sure you want to delete this gallery?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await client.models.Gallery.delete({ id: galleryId });
          // Remove the gallery from the state
          setGalleries(prevGalleries => prevGalleries.filter(g => g.id !== galleryId));
          toast.current?.show({
            severity: 'success',
            summary: 'Gallery Deleted',
            detail: 'Gallery has been successfully deleted',
            life: 3000,
          });
        } catch (err) {
          console.error('Error deleting gallery:', err);
          toast.current?.show({
            severity: 'error',
            summary: 'Deletion Failed',
            detail: err instanceof Error ? err.message : 'Failed to delete gallery',
            life: 5000,
          });
        }
      },
    });
  };

  // Fetch galleries on component mount and when refreshTrigger changes
  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        setLoading(true);
        const response = await client.models.Gallery.list();

        // Convert the response to our Gallery type
        if (response.data) {
          const formattedGalleries: Gallery[] = response.data.map(gallery => ({
            id: gallery.id,
            name: gallery.name,
            description: gallery.description,
            createdDate: gallery.createdDate,
          }));

          setGalleries(formattedGalleries);
        }
      } catch (err) {
        console.error('Error fetching galleries:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch galleries');
      } finally {
        setLoading(false);
      }
    };

    fetchGalleries();
  }, [refreshTrigger]); // Add refreshTrigger to the dependency array

  // Sort galleries based on the selected sort option
  const sortedGalleries = [...galleries].sort((a, b) => {
    const { value, direction } = sortBy;

    if (value === 'createdDate') {
      const dateA = new Date(a.createdDate).getTime();
      const dateB = new Date(b.createdDate).getTime();
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (value === 'name') {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <ProgressSpinner />
        <p>Loading galleries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem', color: 'var(--red-500)' }}></i>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (galleries.length === 0) {
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
      <Toast ref={toast} />
      <ConfirmDialog />
      <GalleryDetail
        galleryId={selectedGalleryId}
        visible={detailDialogVisible}
        onHide={() => setDetailDialogVisible(false)}
      />

      <div className={styles.galleryHeader}>
        <h2 className={styles.galleryListTitle}>Your Galleries</h2>
        <div className={styles.sortContainer}>
          <span>Sort by:</span>
          <Dropdown
            value={sortBy}
            options={sortOptions}
            onChange={e => setSortBy(e.value)}
            optionLabel='label'
            className={styles.sortDropdown}
          />
        </div>
      </div>

      <div className={styles.galleryGrid}>
        {sortedGalleries.map(gallery => (
          <Card
            key={gallery.id}
            title={gallery.name}
            className={styles.galleryCard}
            subTitle={`Created on ${new Date(gallery.createdDate).toLocaleDateString()}`}
            footer={
              <div className={styles.cardFooter}>
                <Button
                  icon='pi pi-trash'
                  severity='danger'
                  text
                  tooltip='Delete Gallery'
                  tooltipOptions={{ position: 'bottom' }}
                  onClick={() => handleDeleteGallery(gallery.id)}
                />
                <Button
                  icon='pi pi-images'
                  text
                  tooltip='View Gallery'
                  tooltipOptions={{ position: 'bottom' }}
                  onClick={() => {
                    setSelectedGalleryId(gallery.id);
                    setDetailDialogVisible(true);
                  }}
                />
              </div>
            }>
            <p>{gallery.description || 'No description'}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GalleryList;
