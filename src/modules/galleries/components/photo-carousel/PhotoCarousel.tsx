import type { ExifSummary } from '@/lib/exif';
import { summarizeExif } from '@/lib/exif';
import { useImageUrls } from '@/lib/imageUrl';
import { ProgressSpinner } from 'primereact/progressspinner';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactImageGallery, { ReactImageGalleryItem } from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { THUMBNAIL_PREFIX, UPLOADS_PREFIX } from '../../../../../constants';
import ExifPanel from '../exif-panel';
import styles from './PhotoCarousel.module.css';

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
    exifData?: unknown;
  };
}

/** react-image-gallery passes the whole item object through to renderItem, so
 *  per-slide data rides along on it rather than being looked up by index —
 *  more than one slide renders during a transition. */
interface CarouselItem extends ReactImageGalleryItem {
  exifSummary: ExifSummary | null;
}

interface PhotoCarouselProps {
  galleryImages: GalleryImage[];
  isLoading: boolean;
  onSlide?: (index: number) => void;
}

const PhotoCarousel = ({ galleryImages, isLoading, onSlide }: PhotoCarouselProps) => {
  const galleryRef = useRef<ReactImageGallery>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const galleryItems = useMemo<CarouselItem[]>(
    () =>
      galleryImages.map(gi => ({
        original: gi.image.s3Key,
        thumbnail: gi.image.s3ThumbnailKey || gi.image.s3Key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX),
        description: gi.image.description || gi.image.title || '',
        originalTitle: gi.image.title,
        originalHeight: gi.image.height || 0,
        originalWidth: gi.image.width || 0,
        // Summarised once per image here rather than in ExifPanel, so it is not
        // recomputed on every render of every visible slide.
        exifSummary: summarizeExif(gi.image.exifData),
      })),
    [galleryImages],
  );

  // Full-size and thumbnail keys resolved in one batch — see useImageUrls.
  const imageKeys = useMemo(
    () => Array.from(new Set(galleryItems.flatMap(item => [item.original, item.thumbnail!]))),
    [galleryItems],
  );
  const imageUrls = useImageUrls(imageKeys);

  const handleSlide = (index: number) => {
    setCurrentIndex(index);
    onSlide?.(index);
  };

  useEffect(() => {
    [currentIndex - 1, currentIndex + 2]
      .filter(i => i >= 0 && i < galleryItems.length)
      .forEach(i => {
        // Skip until the URL resolves, or `src` becomes the string "undefined".
        const src = imageUrls[galleryItems[i].original];
        if (!src) return;
        const img = new Image();
        img.src = src;
      });
  }, [currentIndex, galleryItems, imageUrls]);

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
        <i
          className='pi pi-images'
          style={{ fontSize: '3rem', color: 'var(--color-text-subtle)' }}
        />
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
    <div
      className={styles.galleryContainer}
      ref={containerRef}>
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
            aria-label='Previous image'>
            <i className='pi pi-chevron-left' />
          </button>
        )}
        renderRightNav={(onClick, disabled) => (
          <button
            className={`${styles.navBtn} ${styles.navRight}`}
            onClick={onClick}
            disabled={disabled}
            aria-label='Next image'>
            <i className='pi pi-chevron-right' />
          </button>
        )}
        renderItem={(item: ReactImageGalleryItem) => {
          const { exifSummary } = item as CarouselItem;
          const src = imageUrls[item.original];

          return (
            <div className={styles.imageContainer}>
              {src && (
                <LazyLoadImage
                  src={src}
                  alt={item.originalTitle || item.description || 'Gallery image'}
                  className={styles.image}
                />
              )}
              <div className={styles.imageOverlay}>
                <ExifPanel
                  summary={exifSummary}
                  visible={showInfo}
                />
                <div className={styles.imageActions}>
                  {/* Hidden entirely for images with no camera data —
                        screenshots, PNGs, export-stripped JPEGs. */}
                  {exifSummary && (
                    <button
                      className={`${styles.actionBtn} ${showInfo ? styles.actionBtnActive : ''}`}
                      onClick={() => setShowInfo(prev => !prev)}
                      aria-label='Image details'
                      aria-pressed={showInfo}>
                      <i className='pi pi-info-circle' />
                    </button>
                  )}
                  <button
                    className={styles.actionBtn}
                    onClick={handleFullscreen}
                    aria-label='Expand fullscreen'>
                    <i className='pi pi-expand' />
                  </button>
                </div>
              </div>
            </div>
          );
        }}
        renderThumbInner={(item: ReactImageGalleryItem) => {
          const src = imageUrls[item.thumbnail!];

          return (
            <div className={styles.thumbnailContainer}>
              {src && (
                <LazyLoadImage
                  src={src}
                  alt={item.originalTitle || item.description || 'Gallery thumbnail'}
                  className={styles.thumbnailImage}
                />
              )}
            </div>
          );
        }}
      />
    </div>
  );
};

export default memo(PhotoCarousel);
