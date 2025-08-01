import { useAuth } from '@/context/AuthContext';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { Link } from '@tanstack/react-router';
import { Button } from 'primereact/button';

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
    <article className={styles.galleryCard}>
      <Link
        to='/galleries/$galleryId'
        params={{ galleryId: gallery.id }}
        className={styles.galleryCardLink}>
        <div className={styles.galleryCard}>
          <h2 className={styles.galleryCardTitle}>{gallery.name}</h2>
          {gallery.thumbnailImage && (
            <StorageImage
              path={gallery.thumbnailImage?.s3ThumbnailKey || ''}
              alt={gallery.thumbnailImage?.title || 'Gallery Thumbnail'}
              className={styles.galleryThumbnail}
            />
          )}
        </div>
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
    </article>
  );
};

export default GalleryCard;
