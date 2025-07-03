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
        <Card
          title={gallery.name}
          className={styles.galleryCard}></Card>
      </Link>
      {isAdmin && onDelete && (
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
  );
};

export default GalleryCard;
