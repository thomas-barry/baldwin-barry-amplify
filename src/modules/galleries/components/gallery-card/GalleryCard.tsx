import { useAuth } from '@/context/AuthContext';
import { Link } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import { Gallery } from '../../types';
import styles from './GalleryCard.module.css';

interface GalleryCardProps {
  gallery: Gallery;
  onDelete?: (gallery: Gallery) => void;
}

const CLOUDFRONT_DOMAIN = import.meta.env.VITE_CLOUDFRONT_DOMAIN || 'd3v1ijc4huf10a.cloudfront.net';

const GalleryCard = ({ gallery, onDelete }: GalleryCardProps) => {
  const { isAdmin } = useAuth();
  const photoCount = gallery.images?.length ?? 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(gallery);
  };

  return (
    <article className={styles.card}>
      <Link
        to='/photos/$galleryId'
        params={{ galleryId: gallery.id }}
        className={styles.cardLink}
      >
        <div className={styles.imageWrapper}>
          {gallery.thumbnailImage ? (
            <img
              src={`https://${CLOUDFRONT_DOMAIN}/${gallery.thumbnailImage.s3ThumbnailKey}`}
              alt={gallery.thumbnailImage.title || 'Gallery thumbnail'}
              className={styles.cardImage}
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <i className='pi pi-images' />
            </div>
          )}
          {isAdmin && (
            <div className={styles.adminOverlay}>
              <Link
                to='/photos/$galleryId/edit'
                params={{ galleryId: gallery.id }}
                className={styles.adminLinkBtn}
                onClick={e => e.stopPropagation()}
              >
                <Button
                  icon='pi pi-pencil'
                  severity='info'
                  size='small'
                  rounded
                  aria-label='Edit gallery'
                  onClick={e => e.stopPropagation()}
                />
              </Link>
              {onDelete && (
                <Button
                  icon='pi pi-trash'
                  severity='danger'
                  size='small'
                  rounded
                  aria-label='Delete gallery'
                  onClick={handleDelete}
                />
              )}
            </div>
          )}
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{gallery.name}</h3>
          <span className={styles.cardCount}>
            {photoCount === 1 ? '1 photo' : `${photoCount} photos`}
          </span>
        </div>
      </Link>
    </article>
  );
};

export default GalleryCard;
