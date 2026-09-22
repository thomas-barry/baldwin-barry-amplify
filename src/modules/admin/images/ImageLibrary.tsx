import { Icon, iconClass } from '@/components/Icon';
import { getAdminClient } from '@/lib/dataClient';
import {
  auditLibrary,
  imageLibraryGalleriesQueryOptions,
  imageLibraryMembershipsQueryOptions,
  imageLibraryMusingsQueryOptions,
  imageLibraryQueryOptions,
  type ImageUsage,
  type LibraryImage,
} from '@/lib/imageLibrary';
import { useImageUrls } from '@/lib/imageUrl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { remove } from 'aws-amplify/storage';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useMemo, useRef, useState } from 'react';
import styles from './ImageLibrary.module.css';

type Facet = 'all' | 'orphans' | 'musings' | 'galleries';

const FACETS: { value: Facet; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'orphans', label: 'Orphans' },
  { value: 'musings', label: 'In musings' },
  { value: 'galleries', label: 'In galleries' },
];

/** `title` is set from the file name at upload, so strip the extension. */
const altTextFor = (image: LibraryImage) =>
  (image.title?.trim() || image.fileName).replace(/\.(jpe?g|png|gif|webp|avif|tiff?)$/i, '');

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * Deletes one image's objects, then its row.
 *
 * Order matters. Bytes left behind with no row are unreachable from anywhere in
 * this app — sweeping `uploads/` is deliberately out of scope (docs/adr/0006) —
 * whereas a row left behind stays listed here and can simply be deleted again.
 * So the row goes last, and only if every object went first.
 *
 * S3 `DeleteObject` succeeds for a key that was never there, so a row whose
 * original was already removed by an abandoned draft deletes cleanly.
 */
async function deleteImage(image: LibraryImage): Promise<void> {
  // A Set because the Lambda writes `s3ThumbnailKey` equal to `s3Key` when it
  // cannot build a derivative, and deleting the same key twice is not an error
  // worth reporting as one.
  const keys = [
    ...new Set(
      [image.s3Key, image.s3ThumbnailKey, image.s3DisplayKey].filter(
        (key): key is string => key !== null && key !== '',
      ),
    ),
  ];
  // `remove()` returns a cancellable RemoveOperation rather than a Promise. It
  // is thenable, so wrapping it is enough to hand it to `allSettled`.
  const results = await Promise.allSettled(keys.map(key => Promise.resolve(remove({ path: key }))));
  const failures = results.filter(result => result.status === 'rejected').length;
  if (failures > 0) {
    throw new Error(`${failures} of ${keys.length} files could not be deleted`);
  }
  const { errors } = await getAdminClient().models.Image.delete({ id: image.id });
  if (errors?.length) throw new Error(errors[0].message);
}

const ImageLibrary = () => {
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);
  const [facet, setFacet] = useState<Facet>('all');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const imagesQuery = useQuery(imageLibraryQueryOptions());
  const galleriesQuery = useQuery(imageLibraryGalleriesQueryOptions());
  const membershipsQuery = useQuery(imageLibraryMembershipsQueryOptions());
  const musingsQuery = useQuery(imageLibraryMusingsQueryOptions());

  const isLoading =
    imagesQuery.isLoading || galleriesQuery.isLoading || membershipsQuery.isLoading || musingsQuery.isLoading;
  const error = imagesQuery.error ?? galleriesQuery.error ?? membershipsQuery.error ?? musingsQuery.error;

  const images = useMemo(() => imagesQuery.data?.items ?? [], [imagesQuery.data]);

  /**
   * A walk that stopped at its cap returns a partial reference set, and an
   * image whose only reference was never fetched reads as an orphan. Deleting
   * on that answer is the one failure this page must not have, so a truncated
   * walk disables deletion outright rather than degrading quietly.
   */
  const truncated =
    Boolean(imagesQuery.data?.truncated) ||
    Boolean(galleriesQuery.data?.truncated) ||
    Boolean(membershipsQuery.data?.truncated) ||
    Boolean(musingsQuery.data?.truncated);

  const audit = useMemo(
    () =>
      auditLibrary(
        images,
        galleriesQuery.data?.items ?? [],
        membershipsQuery.data?.byImage ?? new Map(),
        musingsQuery.data?.items ?? [],
      ),
    [images, galleriesQuery.data, membershipsQuery.data, musingsQuery.data],
  );

  const orphanCount = useMemo(
    () => images.filter(image => audit.usage.get(image.id)?.isOrphan).length,
    [images, audit],
  );

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return images.filter(image => {
      const usage = audit.usage.get(image.id);
      if (facet === 'orphans' && !usage?.isOrphan) return false;
      if (facet === 'musings' && !usage?.musings.length) return false;
      if (facet === 'galleries' && !usage?.galleries.length) return false;
      if (!needle) return true;
      return image.fileName.toLowerCase().includes(needle) || (image.title?.toLowerCase().includes(needle) ?? false);
    });
  }, [images, audit, facet, filter]);

  // Memoised because `useImageUrls` keys its presigned-URL query on this array.
  const thumbnailKeys = useMemo(() => images.map(image => image.s3ThumbnailKey ?? image.s3Key), [images]);
  const thumbnailUrls = useImageUrls(thumbnailKeys);

  const selectable = useMemo(() => visible.filter(image => audit.usage.get(image.id)?.isOrphan), [visible, audit]);
  const selectedImages = useMemo(() => images.filter(image => selected.has(image.id)), [images, selected]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelectableSelected = selectable.length > 0 && selectable.every(image => selected.has(image.id));
  const toggleAll = () =>
    setSelected(prev => {
      if (allSelectableSelected) {
        const next = new Set(prev);
        for (const image of selectable) next.delete(image.id);
        return next;
      }
      return new Set([...prev, ...selectable.map(image => image.id)]);
    });

  const deleteMutation = useMutation({
    mutationFn: async (targets: LibraryImage[]) => {
      // Per image rather than per operation: one image failing must not leave
      // the others half-deleted, and the report has to name which one died.
      const results = await Promise.allSettled(targets.map(deleteImage));
      const failed = targets.filter((_image, index) => results[index].status === 'rejected');
      const deleted = targets.filter((_image, index) => results[index].status === 'fulfilled');
      return { deleted, failed };
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['imageLibrary'] });
      // Failures stay selected so the retry is one click, not a re-hunt.
      setSelected(new Set(failed.map(image => image.id)));
      if (failed.length === 0) {
        toast.current?.show({
          severity: 'success',
          summary: `${deleted.length} image${deleted.length === 1 ? '' : 's'} deleted`,
          life: 3000,
        });
      } else {
        toast.current?.show({
          severity: 'warn',
          summary: `${deleted.length} deleted, ${failed.length} failed`,
          detail: failed.map(image => image.fileName).join(', '),
          life: 8000,
        });
      }
    },
    onError: (err: unknown) =>
      toast.current?.show({
        severity: 'error',
        summary: 'Could not delete',
        detail: err instanceof Error ? err.message : 'Something went wrong.',
        life: 5000,
      }),
  });

  const confirmDelete = () => {
    const targets = selectedImages;
    if (targets.length === 0) return;
    confirmDialog({
      header: `Delete ${targets.length} image${targets.length === 1 ? '' : 's'}?`,
      icon: iconClass('exclamation-triangle'),
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      // Names, not a count: the point of the dialog is the chance to notice
      // one you did not mean to include.
      message: (
        <div className={styles.confirm}>
          <p>The files and their records are removed. This cannot be undone.</p>
          <ul className={styles.confirmList}>
            {targets.map(image => (
              <li key={image.id}>{image.fileName}</li>
            ))}
          </ul>
        </div>
      ),
      accept: () => deleteMutation.mutate(targets),
    });
  };

  const renderUsage = (usage: ImageUsage | undefined) => {
    if (!usage) return null;
    if (usage.isOrphan) return <span className={styles.orphanTag}>Orphan</span>;
    return (
      <ul className={styles.refs}>
        {usage.galleries.map(ref => (
          <li key={`g-${ref.id}`}>
            <Link
              to='/photos/$galleryId'
              params={{ galleryId: ref.id }}
              className={styles.refLink}>
              <Icon name='images' /> {ref.name}
            </Link>
            {ref.isThumbnail && <span className={styles.badge}>thumbnail</span>}
          </li>
        ))}
        {usage.musings.map(ref => (
          <li key={`m-${ref.id}`}>
            <Link
              to='/blog/$postId'
              params={{ postId: ref.id }}
              className={styles.refLink}>
              <Icon name='book' /> {ref.title.trim() || 'Untitled draft'}
            </Link>
            {!ref.published && <span className={styles.badge}>draft</span>}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.page}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <header className={styles.header}>
        <h1 className={styles.title}>Images</h1>
        <p className={styles.subtitle}>
          {images.length} image{images.length === 1 ? '' : 's'} in the library, {orphanCount} referred to by nothing.
        </p>
      </header>

      {truncated && (
        <p className={styles.warning}>
          <Icon name='exclamation-triangle' /> The library is larger than this page can read in one pass, so what an
          image is used for cannot be determined reliably. Deleting is disabled. See <code>docs/adr/0006</code>.
        </p>
      )}

      <div className={styles.controls}>
        <div
          className={styles.facets}
          role='group'
          aria-label='Filter images by use'>
          {FACETS.map(option => (
            <button
              key={option.value}
              type='button'
              className={option.value === facet ? `${styles.facet} ${styles.facetActive}` : styles.facet}
              aria-pressed={option.value === facet}
              onClick={() => setFacet(option.value)}>
              {option.label}
              {option.value === 'orphans' && orphanCount > 0 && <span className={styles.count}>{orphanCount}</span>}
            </button>
          ))}
        </div>
        <InputText
          value={filter}
          onChange={event => setFilter(event.target.value)}
          className={styles.textFilter}
          placeholder='Filter by file name or title'
        />
      </div>

      {isLoading && (
        <div className={styles.loader}>
          <ProgressSpinner />
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>{error instanceof Error ? error.message : 'Could not load the image library.'}</p>
          <Button
            label='Try again'
            icon={iconClass('refresh')}
            onClick={() => {
              void imagesQuery.refetch();
              void galleriesQuery.refetch();
              void membershipsQuery.refetch();
              void musingsQuery.refetch();
            }}
          />
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.selectCell}>
                    <input
                      type='checkbox'
                      checked={allSelectableSelected}
                      disabled={selectable.length === 0 || truncated}
                      onChange={toggleAll}
                      aria-label='Select every orphan shown'
                    />
                  </th>
                  <th className={styles.thumbCell}>
                    <span className={styles.srOnly}>Preview</span>
                  </th>
                  <th>File</th>
                  <th className={styles.dateCell}>Uploaded</th>
                  <th>Used by</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(image => {
                  const usage = audit.usage.get(image.id);
                  const thumbnailUrl = thumbnailUrls[image.s3ThumbnailKey ?? image.s3Key];
                  return (
                    <tr
                      key={image.id}
                      className={selected.has(image.id) ? styles.selectedRow : undefined}>
                      <td className={styles.selectCell}>
                        <input
                          type='checkbox'
                          checked={selected.has(image.id)}
                          // Only orphans are deletable: "not in a musing" would
                          // match every gallery photo on the site.
                          disabled={!usage?.isOrphan || truncated}
                          onChange={() => toggle(image.id)}
                          aria-label={`Select ${image.fileName}`}
                        />
                      </td>
                      <td className={styles.thumbCell}>
                        {thumbnailUrl && (
                          <img
                            className={styles.thumb}
                            src={thumbnailUrl}
                            alt={altTextFor(image)}
                            loading='lazy'
                          />
                        )}
                      </td>
                      <td>
                        <span className={styles.fileName}>{image.fileName}</span>
                        <span className={styles.key}>{image.s3Key}</span>
                      </td>
                      <td className={styles.dateCell}>{formatDate(image.uploadDate)}</td>
                      <td>{renderUsage(usage)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className={styles.empty}>
                {/* An empty list has three causes and they are not
                    interchangeable: claiming the library has no orphans when a
                    text filter simply matched none of them is a false statement
                    about the one thing this page exists to be trusted on. */}
                {images.length === 0
                  ? 'No images uploaded yet.'
                  : facet === 'orphans' && orphanCount === 0
                    ? 'Nothing is unused — every image is in a gallery or a musing.'
                    : 'No images match that filter.'}
              </p>
            )}
          </div>

          {audit.brokenReferences.length > 0 && (
            <section className={styles.broken}>
              <h2 className={styles.brokenTitle}>
                <Icon name='exclamation-triangle' /> Broken references
              </h2>
              <p className={styles.brokenHint}>
                These musings point at images the library no longer holds. Nothing here can be fixed automatically —
                edit the musing, or re-upload the image.
              </p>
              <ul className={styles.brokenList}>
                {audit.brokenReferences.map(broken => (
                  <li key={broken.key}>
                    <code>{broken.key}</code>
                    <span className={styles.brokenIn}>
                      in{' '}
                      {broken.musings.map(ref => (
                        <Link
                          key={ref.id}
                          to='/blog/$postId'
                          params={{ postId: ref.id }}
                          className={styles.refLink}>
                          {ref.title.trim() || 'Untitled draft'}
                        </Link>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {selected.size > 0 && (
        <div
          className={styles.actionBar}
          role='status'>
          <span>
            {selected.size} orphan{selected.size === 1 ? '' : 's'} selected
          </span>
          <Button
            label='Clear'
            text
            onClick={() => setSelected(new Set())}
            disabled={deleteMutation.isPending}
          />
          <Button
            label='Delete'
            icon={iconClass('trash')}
            severity='danger'
            loading={deleteMutation.isPending}
            disabled={truncated}
            onClick={confirmDelete}
          />
        </div>
      )}
    </div>
  );
};

export default ImageLibrary;
