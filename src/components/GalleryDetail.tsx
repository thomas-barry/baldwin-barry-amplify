import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useEffect, useState } from 'react';
import type { Schema } from '../../amplify/data/resource';
import styles from './GalleryDetail.module.css';
import { Gallery } from './GalleryList';

interface GalleryDetailProps {
  galleryId: string | null;
  visible: boolean;
  onHide: () => void;
}

const GalleryDetail = ({ galleryId, visible, onHide }: GalleryDetailProps) => {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate the client for our Amplify data models
  const client = generateClient<Schema>();

  // Fetch gallery details when the component becomes visible
  useEffect(() => {
    const fetchGalleryDetails = async () => {
      if (!galleryId || !visible) return;

      try {
        setLoading(true);
        const response = await client.models.Gallery.get({ id: galleryId });

        if (response.data) {
          setGallery({
            id: response.data.id,
            name: response.data.name,
            description: response.data.description,
            createdDate: response.data.createdDate,
          });
        } else {
          setError('Gallery not found');
        }
      } catch (err) {
        console.error('Error fetching gallery details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch gallery details');
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryDetails();
  }, [galleryId, visible]);

  const renderHeader = () => {
    return (
      <div className={styles.dialogHeader}>
        <h2 className={styles.dialogTitle}>{gallery?.name || 'Gallery Details'}</h2>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <ProgressSpinner />
          <p>Loading gallery details...</p>
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

    if (!gallery) {
      return <p>No gallery information available</p>;
    }

    return (
      <div className={styles.galleryDetailContent}>
        <div className={styles.galleryMetadata}>
          <p>
            <strong>Created on:</strong> {new Date(gallery.createdDate).toLocaleString()}
          </p>
          <p>
            <strong>Description:</strong> {gallery.description || 'No description'}
          </p>
        </div>

        <div className={styles.imagesSection}>
          <h3>Gallery Images</h3>
          <div className={styles.imageList}>
            <div className={styles.emptyGallery}>
              <i
                className='pi pi-image'
                style={{ fontSize: '3rem', color: 'var(--surface-500)' }}></i>
              <p>This gallery has no images yet</p>
              <p className={styles.subText}>Upload images using the file uploader</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const footerContent = (
    <div>
      <Button
        label='Close'
        icon='pi pi-times'
        onClick={onHide}
        className='p-button-secondary'
      />
    </div>
  );

  return (
    <Dialog
      header={renderHeader}
      visible={visible}
      style={{ width: '80vw', maxWidth: '1000px' }}
      onHide={onHide}
      footer={footerContent}
      resizable={false}
      draggable={false}
      className={styles.galleryDialog}>
      {renderContent()}
    </Dialog>
  );
};

export default GalleryDetail;
