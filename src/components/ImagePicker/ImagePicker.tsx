import { useImageUrls } from '@/lib/imageUrl';
import { formatImageMarkdown } from '@/lib/markdown';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useMemo, useRef, useState } from 'react';
import styles from './ImagePicker.module.css';

const client = generateClient<Schema>({ authMode: 'apiKey' });

/** Pages are walked to completion so the grid never silently hides an image. */
const PAGE_SIZE = 100;
const MAX_IMAGES = 500;

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ['images'],
    enabled: visible,
    queryFn: async () => {
      // The first call takes no token so `page` infers cleanly; threading a
      // token through a declared-then-assigned variable instead makes the
      // inference circular (TS7022).
      const items: Schema['Image']['type'][] = [];
      let page = await client.models.Image.list({ limit: PAGE_SIZE });
      items.push(...page.data);
      while (page.nextToken && items.length < MAX_IMAGES) {
        page = await client.models.Image.list({ limit: PAGE_SIZE, nextToken: page.nextToken });
        items.push(...page.data);
      }
      // DynamoDB returns scan order; newest-first is what you want when the
      // image you are reaching for is usually the one just uploaded.
      return items.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
    },
  });

  const visibleImages = useMemo(() => {
    if (!images) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return images;
    return images.filter(
      image => image.fileName.toLowerCase().includes(needle) || (image.title?.toLowerCase().includes(needle) ?? false),
    );
  }, [images, filter]);

  // Memoised because `useImageUrls` keys its presigned-URL query on this array.
  const thumbnailKeys = useMemo(() => (images ?? []).map(image => image.s3ThumbnailKey ?? image.s3Key), [images]);
  const thumbnailUrls = useImageUrls(thumbnailKeys);

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

          <InputText
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className='w-full'
            placeholder='Filter by file name or title'
          />

          {isLoading ? (
            <div className={styles.loader}>
              <ProgressSpinner />
            </div>
          ) : visibleImages.length === 0 ? (
            <p className={styles.empty}>
              {images?.length ? 'No images match that filter.' : 'No images uploaded yet.'}
            </p>
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
