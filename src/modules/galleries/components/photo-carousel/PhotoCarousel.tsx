import type { ExifSummary } from '@/lib/exif';
import { summarizeExif } from '@/lib/exif';
import { useImageUrls } from '@/lib/imageUrl';
import { ProgressSpinner } from 'primereact/progressspinner';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryItem } from 'react-image-gallery';
import ReactImageGallery from 'react-image-gallery';
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
interface CarouselItem extends GalleryItem {
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

/** Slides this far from the current one render a real <img> rather than a lazy
 *  placeholder — see the note on `isNear` in renderItem. */
const RENDER_AHEAD = 1;
/** Slides this far out are fetched into the HTTP cache but not decoded. */
const PRELOAD_AHEAD = 2;

/** The DOM spells this attribute `fetchpriority`, all lowercase, and React 18
 *  passes unknown lowercase attributes straight through. It does NOT support the
 *  camelCase `fetchPriority` — it warns and drops the attribute — even though
 *  React 18's own types declare it, which is why writing the camelCase form
 *  type-checked cleanly and then did nothing at all.
 *
 *  The cast is what that mismatch costs: the working spelling is the one the
 *  types reject. React 19 supports the camelCase prop, so on that upgrade this
 *  helper can go away in favour of a plain `fetchPriority={...}`. */
const fetchPriorityAttr = (distance: number) =>
  ({ fetchpriority: distance === 0 ? 'high' : 'low' }) as Record<string, string>;

/** Distance in slides, the short way round: react-image-gallery is `infinite`
 *  by default, so the last slide is one step from the first. */
const slideDistance = (index: number, current: number, total: number) => {
  const direct = Math.abs(index - current);
  return Math.min(direct, total - direct);
};

const PhotoCarousel = ({
  galleryImages,
  isLoading,
  onSlide,
  chromeVisible = true,
  onToggleChrome,
}: PhotoCarouselProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const tapStart = useRef<{ x: number; y: number; at: number } | null>(null);
  // Preloaded images are held rather than dropped: an in-flight Image with no
  // reference to it is collectable, and mobile Safari cancels its request when
  // it goes — the preload then silently does nothing.
  const preloaded = useRef(new Map<string, HTMLImageElement>());

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
    // Hiding the chrome is a touch affordance: on a phone the controls sit on
    // top of the photo and there is nowhere else to put them. With a mouse they
    // are out of the way already, and a click that silently removes the
    // navigation reads as a bug rather than a gesture.
    if (event.pointerType === 'mouse') return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP_PX) return;
    if (Date.now() - start.at > TAP_MAX_MS) return;
    // A tap on the info button would otherwise open the panel and immediately
    // hide the chrome it lives in.
    if ((event.target as HTMLElement).closest('button, a')) return;
    onToggleChrome();
  };

  useEffect(() => {
    const cache = preloaded.current;
    const wanted = new Set<string>();

    galleryItems.forEach((item, index) => {
      if (slideDistance(index, currentIndex, galleryItems.length) > PRELOAD_AHEAD) return;
      // Skip until the URL resolves, or `src` becomes the string "undefined".
      const src = imageUrls[item.original];
      if (!src) return;
      wanted.add(src);
      if (cache.has(src)) return;
      const img = new Image();
      img.src = src;
      cache.set(src, img);
    });

    // Bounded to the window, or a long gallery ends up holding every decoded
    // bitmap it has walked past — the one thing a phone has least of.
    cache.forEach((_, src) => {
      if (!wanted.has(src)) cache.delete(src);
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
        renderItem={(item: GalleryItem) => {
          const { exifSummary, slideIndex } = item as CarouselItem;
          const src = imageUrls[item.original];
          const alt = item.originalTitle || item.description || 'Gallery image';
          // Every slide is in the DOM, but only the centre one is ever on
          // screen: .image-gallery-slides clips its neighbours away entirely,
          // so their IntersectionObserver never fires and LazyLoadImage leaves
          // them without an <img> until they slide in. That is the whole reason
          // the next photo appears to load from scratch on a swipe. The window
          // around the current slide therefore renders eagerly instead.
          const distance = slideDistance(slideIndex, currentIndex, galleryItems.length);
          const isNear = distance <= RENDER_AHEAD;

          return (
            <div
              className={styles.imageContainer}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}>
              {src &&
                (isNear ? (
                  <img
                    src={src}
                    alt={alt}
                    className={styles.image}
                    decoding='async'
                    // The neighbours are speculative; they must not compete with
                    // the photo the viewer is actually looking at for a cold
                    // cellular connection's bandwidth.
                    {...fetchPriorityAttr(distance)}
                  />
                ) : (
                  <LazyLoadImage
                    src={src}
                    alt={alt}
                    className={styles.image}
                  />
                ))}
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
        renderThumbInner={(item: GalleryItem) => {
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
