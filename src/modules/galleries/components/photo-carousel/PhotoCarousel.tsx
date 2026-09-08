import type { ExifSummary } from '@/lib/exif';
import { summarizeExif } from '@/lib/exif';
import { useImageUrls } from '@/lib/imageUrl';
import { ProgressSpinner } from 'primereact/progressspinner';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactImageGallery, { ReactImageGalleryItem } from 'react-image-gallery';
// image-gallery.css is NOT imported here — index.css imports it into
// `layer(gallery)`. An import from a .tsx is unlayered, and unlayered CSS beats
// every layer, so a second copy here would outrank the overrides below.
import { LazyLoadImage } from 'react-lazy-load-image-component';
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
    s3DisplayKey?: string | null;
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
  /** Its own position, so the counter on a slide sliding in reads its number
   *  rather than the one still leaving. */
  slideIndex: number;
}

interface PhotoCarouselProps {
  galleryImages: GalleryImage[];
  isLoading: boolean;
  onSlide?: (index: number) => void;
  /** Owned by Gallery, because the floating header fades with these. */
  chromeVisible?: boolean;
  onToggleChrome?: () => void;
}

/** Below this much travel, or above this long a press, a touch is a swipe or a
 *  drag rather than a tap. */
const TAP_SLOP_PX = 10;
const TAP_MAX_MS = 400;

const PhotoCarousel = ({
  galleryImages,
  isLoading,
  onSlide,
  chromeVisible = true,
  onToggleChrome,
}: PhotoCarouselProps) => {
  const galleryRef = useRef<ReactImageGallery>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const tapStart = useRef<{ x: number; y: number; at: number } | null>(null);

  const galleryItems = useMemo<CarouselItem[]>(
    () =>
      galleryImages.map((gi, index) => ({
        // Serve the capped display copy, not the original — a full-resolution
        // phone photo is several megabytes. Both derived keys are unset when
        // their generation failed, so the original is the fallback for each.
        original: gi.image.s3DisplayKey || gi.image.s3Key,
        thumbnail: gi.image.s3ThumbnailKey || gi.image.s3Key,
        description: gi.image.description || gi.image.title || '',
        originalTitle: gi.image.title,
        originalHeight: gi.image.height || 0,
        originalWidth: gi.image.width || 0,
        // Summarised once per image here rather than in ExifPanel, so it is not
        // recomputed on every render of every visible slide.
        exifSummary: summarizeExif(gi.image.exifData),
        slideIndex: index,
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

  // react-image-gallery owns the swipe, so this cannot be a plain onClick: a
  // swipe ends in a click too, and every navigation would also toggle the
  // chrome. Measuring the pointer's travel separates the two.
  const handlePointerDown = (event: React.PointerEvent) => {
    tapStart.current = { x: event.clientX, y: event.clientY, at: Date.now() };
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = tapStart.current;
    tapStart.current = null;
    if (!start || !onToggleChrome) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP_PX) return;
    if (Date.now() - start.at > TAP_MAX_MS) return;
    // A tap on the info button would otherwise open the panel and immediately
    // hide the chrome it lives in.
    if ((event.target as HTMLElement).closest('button, a')) return;
    onToggleChrome();
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
            className={`${styles.navBtn} ${styles.navLeft} ${chromeVisible ? '' : styles.chromeHidden}`}
            onClick={onClick}
            disabled={disabled}
            aria-label='Previous image'>
            <i className='pi pi-chevron-left' />
          </button>
        )}
        renderRightNav={(onClick, disabled) => (
          <button
            className={`${styles.navBtn} ${styles.navRight} ${chromeVisible ? '' : styles.chromeHidden}`}
            onClick={onClick}
            disabled={disabled}
            aria-label='Next image'>
            <i className='pi pi-chevron-right' />
          </button>
        )}
        renderItem={(item: ReactImageGalleryItem) => {
          const { exifSummary, slideIndex } = item as CarouselItem;
          const src = imageUrls[item.original];

          return (
            <div
              className={styles.imageContainer}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}>
              {src && (
                <LazyLoadImage
                  src={src}
                  alt={item.originalTitle || item.description || 'Gallery image'}
                  className={styles.image}
                />
              )}
              <div className={`${styles.imageOverlay} ${chromeVisible ? '' : styles.chromeHidden}`}>
                <ExifPanel
                  summary={exifSummary}
                  visible={showInfo}
                />
                <div className={styles.imageActions}>
                  {/* The thumbnail strip is hidden on phones, so without this
                        there is no way to tell where you are in the set. */}
                  {galleryItems.length > 1 && (
                    <span className={styles.counter}>
                      {slideIndex + 1} / {galleryItems.length}
                    </span>
                  )}
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
