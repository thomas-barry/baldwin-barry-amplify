import { useImageUrls } from '@/lib/imageUrl';
import { formatImageMarkdown } from '@/lib/markdown';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useMemo, useRef, useState } from 'react';
import styles from './ImagePicker.module.css';

const client = generateClient<Schema>({ authMode: 'apiKey' });

/** Pages are walked to completion so the grid never silently hides an image. */
const PAGE_SIZE = 100;
const MAX_IMAGES = 500;
const MAX_MEMBERSHIPS = 2000;

/** The dropdown's default entry. `null` would collide with PrimeReact's own
 *  "nothing selected" state, which shows the placeholder instead of a label. */
const ALL_GALLERIES = 'all';

/**
 * Walks every page of a list query.
 *
 * The token is threaded through a parameter rather than a
 * declared-then-assigned variable: assigning `page` from `page.nextToken`
 * makes the inference circular and TypeScript gives up on the type (TS7022).
 */
async function listAll<T>(
  fetchPage: (nextToken?: string) => Promise<{ data: T[]; nextToken?: string | null }>,
  max: number,
): Promise<T[]> {
  const items: T[] = [];
  let token: string | undefined;
  do {
    const page = await fetchPage(token);
    items.push(...page.data);
    token = page.nextToken ?? undefined;
  } while (token && items.length < max);
  return items;
}

interface ImagePickerProps {
  visible: boolean;
  onHide: () => void;
}

/**
 * `title` is set from the file name at upload, so strip the extension either
 * way — alt text is read aloud and shown when an image fails to load.
 */
const altTextFor = (image: Schema['Image']['type']) =>
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

  const { data: images, isLoading } = useQuery({
    queryKey: ['images'],
    enabled: visible,
    queryFn: async () => {
      const items = await listAll(nextToken => client.models.Image.list({ limit: PAGE_SIZE, nextToken }), MAX_IMAGES);
      // DynamoDB returns scan order; newest-first is what you want when the
      // image you are reaching for is usually the one just uploaded.
      return items.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
    },
  });

  // Its own key rather than the `['galleries']` one GalleryList owns: that
  // query has a much wider selection set and is cast to a different shape.
  const { data: galleries } = useQuery({
    queryKey: ['galleryOptions'],
    enabled: visible,
    queryFn: async () => {
      const items = await listAll(
        nextToken => client.models.Gallery.list({ limit: PAGE_SIZE, nextToken, selectionSet: ['id', 'name'] }),
        MAX_IMAGES,
      );
      return items.sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  // The join table is the only thing that knows which gallery an image is in.
  // Fetched once and filtered in memory so switching galleries is instant, and
  // so an image in several galleries appears under each of them.
  const { data: memberships } = useQuery({
    queryKey: ['galleryMemberships'],
    enabled: visible,
    queryFn: async () => {
      const items = await listAll(
        nextToken =>
          client.models.GalleryImage.list({ limit: PAGE_SIZE, nextToken, selectionSet: ['galleryId', 'imageId'] }),
        MAX_MEMBERSHIPS,
      );
      const byGallery = new Map<string, Set<string>>();
      for (const { galleryId: gid, imageId } of items) {
        const set = byGallery.get(gid) ?? new Set<string>();
        set.add(imageId);
        byGallery.set(gid, set);
      }
      return byGallery;
    },
  });

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
    const inGallery = galleryId === ALL_GALLERIES ? null : (memberships?.get(galleryId) ?? new Set<string>());
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
    : galleryId !== ALL_GALLERIES && !memberships?.get(galleryId)?.size
      ? 'This gallery has no images yet.'
      : 'No images match that filter.';

  const handleCopy = async (image: Schema['Image']['type']) => {
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
                          <i className={copiedId === image.id ? 'pi pi-check' : 'pi pi-copy'} />
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
