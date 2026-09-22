import { iconClass } from '@/components/Icon';
import {
  imageLibraryGalleriesQueryOptions,
  imageLibraryMembershipsQueryOptions,
  imageLibraryQueryOptions,
  type LibraryImage,
} from '@/lib/imageLibrary';
import { useImageUrls } from '@/lib/imageUrl';
import { formatImageMarkdown } from '@/lib/markdown';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useMemo, useRef, useState } from 'react';
import styles from './ImagePicker.module.css';

/** The dropdown's default entry. `null` would collide with PrimeReact's own
 *  "nothing selected" state, which shows the placeholder instead of a label. */
const ALL_GALLERIES = 'all';

interface ImagePickerProps {
  visible: boolean;
  onHide: () => void;
}

/**
 * `title` is set from the file name at upload, so strip the extension either
 * way — alt text is read aloud and shown when an image fails to load.
 */
const altTextFor = (image: LibraryImage) =>
  (image.title?.trim() || image.fileName).replace(/\.(jpe?g|png|gif|webp|avif|tiff?)$/i, '');

/**
 * Browses every uploaded image and copies a markdown snippet for the one you
 * pick, ready to paste into a musing. Copying rather than inserting keeps the
 * picker independent of whatever is holding the cursor.
 */
const ImagePicker = ({ visible, onHide }: ImagePickerProps) => {
  const [filter, setFilter] = useState('');
  const [galleryId, setGalleryId] = useState<string>(ALL_GALLERIES);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  // The library queries live in `lib/imageLibrary` so this picker and the admin
  // image page read one cache entry rather than two definitions that can drift.
  const { data: imageWalk, isLoading } = useQuery({ ...imageLibraryQueryOptions(), enabled: visible });
  const { data: galleryWalk } = useQuery({ ...imageLibraryGalleriesQueryOptions(), enabled: visible });
  const { data: memberships } = useQuery({ ...imageLibraryMembershipsQueryOptions(), enabled: visible });

  const images = imageWalk?.items;
  const galleries = galleryWalk?.items;

  const galleryOptions = useMemo(
    () => [
      { label: 'All galleries', value: ALL_GALLERIES },
      ...(galleries ?? []).map(gallery => ({ label: gallery.name, value: gallery.id })),
    ],
    [galleries],
  );

  const visibleImages = useMemo(() => {
    if (!images) return [];
    const needle = filter.trim().toLowerCase();
    // An unresolved membership query filters everything out rather than
    // showing the wrong gallery's images while it loads.
    const inGallery = galleryId === ALL_GALLERIES ? null : (memberships?.byGallery.get(galleryId) ?? new Set<string>());
    return images.filter(image => {
      if (inGallery && !inGallery.has(image.id)) return false;
      if (!needle) return true;
      return image.fileName.toLowerCase().includes(needle) || (image.title?.toLowerCase().includes(needle) ?? false);
    });
  }, [images, filter, galleryId, memberships]);

  // Memoised because `useImageUrls` keys its presigned-URL query on this array.
  const thumbnailKeys = useMemo(() => (images ?? []).map(image => image.s3ThumbnailKey ?? image.s3Key), [images]);
  const thumbnailUrls = useImageUrls(thumbnailKeys);

  // An empty grid has three causes and they are not interchangeable: telling
  // someone "no images match that filter" when the gallery they picked is
  // simply empty sends them hunting for a filter they never typed.
  const emptyMessage = !images?.length
    ? 'No images uploaded yet.'
    : galleryId !== ALL_GALLERIES && !memberships?.byGallery.get(galleryId)?.size
      ? 'This gallery has no images yet.'
      : 'No images match that filter.';

  const handleCopy = async (image: LibraryImage) => {
    const snippet = formatImageMarkdown(altTextFor(image), image.s3Key);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedId(image.id);
      toast.current?.show({
        severity: 'success',
        summary: 'Copied',
        detail: snippet,
        life: 3000,
      });
    } catch {
      // Denied permission, or a non-secure context. Show the snippet so it can
      // still be selected and copied by hand.
      toast.current?.show({
        severity: 'warn',
        summary: 'Copy failed',
        detail: `Copy this manually: ${snippet}`,
        life: 8000,
      });
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header='Insert Image'
        visible={visible}
        style={{ width: 'min(900px, 95vw)' }}
        modal
        onHide={onHide}
        draggable={false}
        resizable={false}>
        <div className={styles.container}>
          <p className={styles.hint}>
            Pick an image to copy its markdown, then paste it into the post. Add a caption inside the quotes:
            <code className={styles.hintCode}>![alt](key &quot;caption&quot;)</code>
          </p>

          <div className={styles.filters}>
            <Dropdown
              value={galleryId}
              options={galleryOptions}
              onChange={e => setGalleryId(e.value)}
              className={styles.galleryFilter}
              aria-label='Filter by gallery'
            />
            <InputText
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className={styles.textFilter}
              placeholder='Filter by file name or title'
            />
          </div>

          {isLoading ? (
            <div className={styles.loader}>
              <ProgressSpinner />
            </div>
          ) : visibleImages.length === 0 ? (
            <p className={styles.empty}>{emptyMessage}</p>
          ) : (
            <ul className={styles.grid}>
              {visibleImages.map(image => {
                const thumbnailUrl = thumbnailUrls[image.s3ThumbnailKey ?? image.s3Key];
                return (
                  <li key={image.id}>
                    <button
                      type='button'
                      className={styles.tile}
                      onClick={() => handleCopy(image)}
                      title={image.s3Key}>
                      <span className={styles.thumbFrame}>
                        {thumbnailUrl && (
                          <img
                            className={styles.thumb}
                            src={thumbnailUrl}
                            alt={altTextFor(image)}
                            loading='lazy'
                          />
                        )}
                        <span className={styles.overlay}>
                          <i className={copiedId === image.id ? iconClass('check') : iconClass('copy')} />
                          {copiedId === image.id ? 'Copied' : 'Copy markdown'}
                        </span>
                      </span>
                      <span className={styles.caption}>{altTextFor(image)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default ImagePicker;
