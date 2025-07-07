import { StorageImage } from '@aws-amplify/ui-react-storage';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';

import { Gallery } from '../../types';
import styles from './GalleryCard.module.css';

interface GalleryCardProps {
  gallery: Gallery;
  onDelete?: (gallery: Gallery) => void;
}

const GalleryCard = ({ gallery, onDelete }: GalleryCardProps) => {
  const { isAdmin } = useAuth();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking delete
    e.stopPropagation(); // Stop event bubbling
    if (onDelete) {
      onDelete(gallery);
    }
  };

  return (
    <div className={styles.galleryCardContainer}>
      <Link
        to='/galleries/$galleryId'
        params={{ galleryId: gallery.id }}
        className={styles.galleryCardLink}>
        <Card className={styles.galleryCard}>
          {gallery.thumbnailImage && (
            <div className={styles.thumbnailContainer}>
              <StorageImage
                path={gallery.thumbnailImage.s3ThumbnailKey || gallery.thumbnailImage.s3Key}
                alt={gallery.thumbnailImage.title || gallery.name}
                className={styles.thumbnailImage}
                fallbackSrc='/placeholder-image.jpg'
              />
            </div>
          )}
          {!gallery.thumbnailImage && (
            <div className={styles.placeholderContainer}>
              <i className={`pi pi-image ${styles.placeholderIcon}`} />
              <span className={styles.placeholderText}>No thumbnail</span>
            </div>
          )}
          <div className={styles.cardContent}>
            <h3 className={styles.galleryTitle}>{gallery.name}</h3>
            {gallery.description && (
              <p className={styles.galleryDescription}>{gallery.description}</p>
            )}
          </div>
        </Card>
      </Link>
      {isAdmin && (
        <div className={styles.actionButtons}>
          <Link
            to='/galleries/$galleryId/edit'
            params={{ galleryId: gallery.id }}
            className={styles.editButtonLink}>
            <Button
              icon='pi pi-pencil'
              className={styles.editButton}
              severity='info'
              size='small'
              tooltip='Edit Gallery'
              aria-label='Edit Gallery'
              onClick={e => e.stopPropagation()}
            />
          </Link>
          {onDelete && (
            <Button
              icon='pi pi-trash'
              className={styles.deleteButton}
              onClick={handleDelete}
              severity='danger'
              size='small'
              tooltip='Delete Gallery'
              aria-label='Delete Gallery'
            />
          )}
        </div>
      )}
    </div>
  );
};

export default GalleryCard;
