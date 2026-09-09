import { Icon, iconClass } from '@/components/Icon';
import { LinkButton } from '@/components/LinkButton';
import { useAuth } from '@/context/AuthContext';
import { useImageUrls, withCacheBuster } from '@/lib/imageUrl';
import { Gallery } from '@/modules/galleries/types';
import { Link } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import type { CSSProperties, MouseEvent } from 'react';
import { useMemo } from 'react';
import styles from './GalleryCard.module.css';

interface GalleryCardProps {
  gallery: Gallery;
  onDelete?: (gallery: Gallery) => void;
}

const GalleryCard = ({ gallery, onDelete }: GalleryCardProps) => {
  const { isAdmin } = useAuth();
  const photoCount = gallery.images?.length ?? 0;

  // A gallery can adopt a thumbnail-less image as its cover, so fall back to
  // the original rather than rendering an empty frame.
  const thumbnailKey = gallery.thumbnailImage?.s3ThumbnailKey ?? gallery.thumbnailImage?.s3Key;
  const thumbnailKeys = useMemo(() => (thumbnailKey ? [thumbnailKey] : []), [thumbnailKey]);
  const imageUrls = useImageUrls(thumbnailKeys);
  const thumbnailSrc = withCacheBuster(thumbnailKey ? imageUrls[thumbnailKey] : undefined, gallery.updatedAt);

  const crop = gallery.thumbnailCrop;
  const W = gallery.thumbnailImage?.width;
  const H = gallery.thumbnailImage?.height;
  const cropStyle: CSSProperties =
    crop && W && H
      ? {
          position: 'absolute',
          width: `${100 / crop.size}%`,
          height: 'auto',
          left: `${(-crop.x * 100) / crop.size}%`,
          top: `${(-crop.y * (H / W) * 100) / crop.size}%`,
        }
      : {};

  const handleDelete = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(gallery);
  };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        {gallery.thumbnailImage && thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={gallery.thumbnailImage.title || 'Gallery thumbnail'}
            className={crop && W && H ? undefined : styles.cardImage}
            style={cropStyle}
            loading='lazy'
            decoding='async'
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <Icon name='images' />
          </div>
        )}
        {isAdmin && gallery.adminOnly && (
          <div className={styles.privateBadge}>
            <Icon name='lock' />
            Private
          </div>
        )}
        {isAdmin && (
          <div className={styles.adminOverlay}>
            <LinkButton
              to='/photos/$galleryId/edit'
              params={{ galleryId: gallery.id }}
              icon='pencil'
              iconOnly
              rounded
              size='small'
              severity='info'
              aria-label='Edit gallery'
            />
            {onDelete && (
              <Button
                icon={iconClass('trash')}
                rounded
                text={false}
                severity='danger'
                size='small'
                aria-label='Delete gallery'
                onClick={handleDelete}
              />
            )}
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link
            to='/photos/$galleryId'
            params={{ galleryId: gallery.id }}
            className={styles.cardLink}>
            {gallery.name}
          </Link>
        </h3>
        <span className={styles.cardCount}>{photoCount === 1 ? '1 photo' : `${photoCount} photos`}</span>
      </div>
    </article>
  );
};

export default GalleryCard;
