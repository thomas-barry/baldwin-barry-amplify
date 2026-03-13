import { ProgressSpinner } from 'primereact/progressspinner';
import { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react';
import ReactImageGallery, { ReactImageGalleryItem } from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { THUMBNAIL_PREFIX, UPLOADS_PREFIX } from '../../../../../constants';
import styles from './PhotoCarousel.module.css';

const CLOUDFRONT_DOMAIN = import.meta.env.VITE_CLOUDFRONT_DOMAIN || 'd3v1ijc4huf10a.cloudfront.net';

interface GalleryImage {
  id: string;
  galleryId: string;
  imageId: string;
  addedDate: string;
  order?: number | null;
  image: {
    id: string;
    title: string;
    s3Key: string;
    s3ThumbnailKey?: string | null;
    description?: string | null;
    uploadDate: string;
    contentType?: string | null;
    width: number | null;
    height: number | null;
  };
}

interface PhotoCarouselProps {
  galleryImages: GalleryImage[];
  isLoading: boolean;
  onSlide?: (index: number) => void;
}

export interface PhotoCarouselHandle {
  play: () => void;
  pause: () => void;
}

const PhotoCarousel = forwardRef<PhotoCarouselHandle, PhotoCarouselProps>(
  ({ galleryImages, isLoading, onSlide }, ref) => {
    const galleryRef = useRef<ReactImageGallery>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const total = galleryImages.length;

    useImperativeHandle(ref, () => ({
      play: () => galleryRef.current?.play(),
      pause: () => galleryRef.current?.pause(),
    }));

    const galleryItems = galleryImages.map(gi => ({
      original: gi.image.s3Key,
      thumbnail:
        gi.image.s3ThumbnailKey ||
        gi.image.s3Key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX),
      description: gi.image.description || gi.image.title || '',
      originalTitle: gi.image.title,
      originalHeight: gi.image.height || 0,
      originalWidth: gi.image.width || 0,
    }));

    const handleSlide = (index: number) => {
      setCurrentIndex(index);
      onSlide?.(index);
    };

    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <ProgressSpinner />
          <p>Loading images…</p>
        </div>
      );
    }

    if (!galleryItems.length) {
      return (
        <div className={styles.emptyContainer}>
          <i className='pi pi-images' style={{ fontSize: '3rem', color: 'var(--color-text-subtle)' }} />
          <h3>No Images Yet</h3>
          <p>This gallery doesn't contain any images yet.</p>
        </div>
      );
    }

    const handleFullscreen = () => {
      const el = containerRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(() => undefined);
      } else {
        document.exitFullscreen().catch(() => undefined);
      }
    };

    return (
      <div className={styles.galleryContainer} ref={containerRef}>
        <ReactImageGallery
          ref={galleryRef}
          items={galleryItems}
          showThumbnails
          showPlayButton={false}
          showFullscreenButton={false}
          showNav
          autoPlay={false}
          slideInterval={5000}
          slideDuration={450}
          thumbnailPosition='bottom'
          useBrowserFullscreen
          showBullets={false}
          onSlide={handleSlide}
          renderLeftNav={(onClick, disabled) => (
            <button
              className={`${styles.navBtn} ${styles.navLeft}`}
              onClick={onClick}
              disabled={disabled}
              aria-label='Previous image'
            >
              <i className='pi pi-chevron-left' />
            </button>
          )}
          renderRightNav={(onClick, disabled) => (
            <button
              className={`${styles.navBtn} ${styles.navRight}`}
              onClick={onClick}
              disabled={disabled}
              aria-label='Next image'
            >
              <i className='pi pi-chevron-right' />
            </button>
          )}
          renderItem={(item: ReactImageGalleryItem) => (
            <div className={styles.imageContainer}>
              <LazyLoadImage
                src={`https://${CLOUDFRONT_DOMAIN}/${item.original}`}
                alt={item.originalTitle || item.description || 'Gallery image'}
                className={styles.image}
              />
              <div className={styles.imageOverlay}>
                <span className={styles.counter}>
                  {currentIndex + 1} / {total}
                </span>
                <div className={styles.imageActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={handleFullscreen}
                    aria-label='Expand fullscreen'
                  >
                    <i className='pi pi-expand' />
                  </button>
                  <a
                    className={styles.actionBtn}
                    href={`https://${CLOUDFRONT_DOMAIN}/${item.original}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label='Open image'
                  >
                    <i className='pi pi-external-link' />
                  </a>
                </div>
              </div>
            </div>
          )}
          renderThumbInner={(item: ReactImageGalleryItem) => (
            <div className={styles.thumbnailContainer}>
              <LazyLoadImage
                src={`https://${CLOUDFRONT_DOMAIN}/${item.thumbnail}`}
                alt={item.originalTitle || item.description || 'Gallery thumbnail'}
                className={styles.thumbnailImage}
              />
            </div>
          )}
        />
      </div>
    );
  },
);

PhotoCarousel.displayName = 'PhotoCarousel';

export default memo(PhotoCarousel);
