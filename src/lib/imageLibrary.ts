/**
 * The image library: every uploaded image, and what refers to it.
 *
 * Nothing in the schema records what an image was uploaded for — gallery
 * uploads and images pasted into a musing share the `uploads/` prefix and both
 * become `Image` rows. Usage is therefore derived here by diffing images
 * against the three things that can refer to one: gallery membership, a
 * gallery's thumbnail, and a musing's markdown. See docs/adr/0006.
 *
 * Lives in `lib` rather than the admin module because `ImagePicker` is a shared
 * `components/` component and must not import from `modules/admin`.
 */

import { getAdminClient } from '@/lib/dataClient';
import { extractImageKeys, toServedKey } from '@/lib/markdown';
import { queryOptions } from '@tanstack/react-query';

/** One request per page; the walk follows tokens until the cap. */
const PAGE_SIZE = 100;

/**
 * Caps on each walk. They exist so a runaway table cannot hang the page, not
 * because the data is expected to reach them — and crossing one invalidates
 * docs/adr/0006 rather than just needing a bigger number here.
 */
const MAX_IMAGES = 500;
const MAX_MEMBERSHIPS = 2000;
const MAX_GALLERIES = 500;
const MAX_MUSINGS = 500;

/**
 * The result of walking a list query to the cap.
 *
 * `truncated` is the whole point. A walk that stops early still returns rows,
 * and a partial reference set reports referenced images as orphans — which is
 * a delete button pointed at the wrong rows. Callers must refuse to delete
 * while any walk is truncated.
 */
export interface Walk<T> {
  items: T[];
  truncated: boolean;
}

/**
 * Walks pages until the cap.
 *
 * The token is threaded through a parameter rather than a
 * declared-then-assigned variable: assigning `page` from `page.nextToken`
 * makes the inference circular and TypeScript gives up on the type (TS7022).
 */
async function walk<T>(
  fetchPage: (nextToken?: string) => Promise<{ data: T[]; nextToken?: string | null }>,
  max: number,
): Promise<Walk<T>> {
  const items: T[] = [];
  let token: string | undefined;
  do {
    const page = await fetchPage(token);
    items.push(...page.data);
    token = page.nextToken ?? undefined;
  } while (token && items.length < max);
  return { items, truncated: Boolean(token) };
}

/** The fields the library needs. Selected explicitly to leave `exifData` — by
 *  far the largest field on the row — out of a scan of the whole table. */
export interface LibraryImage {
  id: string;
  title: string;
  fileName: string;
  s3Key: string;
  s3ThumbnailKey: string | null;
  s3DisplayKey: string | null;
  uploadDate: string;
}

export interface LibraryGallery {
  id: string;
  name: string;
  thumbnailImageId: string | null;
}

export interface LibraryMusing {
  id: string;
  title: string;
  content: string;
  published: boolean;
}

export const imageLibraryQueryOptions = () =>
  queryOptions({
    queryKey: ['imageLibrary', 'images'],
    queryFn: async (): Promise<Walk<LibraryImage>> => {
      const result = await walk(
        nextToken =>
          getAdminClient().models.Image.list({
            limit: PAGE_SIZE,
            nextToken,
            selectionSet: ['id', 'title', 'fileName', 's3Key', 's3ThumbnailKey', 's3DisplayKey', 'uploadDate'],
          }),
        MAX_IMAGES,
      );
      // DynamoDB returns scan order; newest-first is what you want when the
      // image you are reaching for is usually the one just uploaded.
      result.items.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
      return result;
    },
  });

export const imageLibraryGalleriesQueryOptions = () =>
  queryOptions({
    queryKey: ['imageLibrary', 'galleries'],
    queryFn: async (): Promise<Walk<LibraryGallery>> => {
      const result = await walk(
        nextToken =>
          getAdminClient().models.Gallery.list({
            limit: PAGE_SIZE,
            nextToken,
            selectionSet: ['id', 'name', 'thumbnailImageId'],
          }),
        MAX_GALLERIES,
      );
      result.items.sort((a, b) => a.name.localeCompare(b.name));
      return result;
    },
  });

export interface MembershipIndex {
  /** Image ids per gallery — what the picker's gallery filter needs. */
  byGallery: Map<string, Set<string>>;
  /** Gallery ids per image — what the usage column needs. */
  byImage: Map<string, string[]>;
}

export interface MembershipWalk extends MembershipIndex {
  truncated: boolean;
}

export const imageLibraryMembershipsQueryOptions = () =>
  queryOptions({
    queryKey: ['imageLibrary', 'memberships'],
    queryFn: async (): Promise<MembershipWalk> => {
      const { items, truncated } = await walk(
        nextToken =>
          getAdminClient().models.GalleryImage.list({
            limit: PAGE_SIZE,
            nextToken,
            selectionSet: ['galleryId', 'imageId'],
          }),
        MAX_MEMBERSHIPS,
      );
      const byGallery = new Map<string, Set<string>>();
      const byImage = new Map<string, string[]>();
      for (const { galleryId, imageId } of items) {
        const images = byGallery.get(galleryId) ?? new Set<string>();
        images.add(imageId);
        byGallery.set(galleryId, images);
        byImage.set(imageId, [...(byImage.get(imageId) ?? []), galleryId]);
      }
      return { truncated, byGallery, byImage };
    },
  });

/**
 * Musings read for their markdown alone, so this has its own key rather than
 * sharing `blogPostsQueryOptions` — that query is cached per audience and
 * carries a different shape.
 */
export const imageLibraryMusingsQueryOptions = () =>
  queryOptions({
    queryKey: ['imageLibrary', 'musings'],
    queryFn: (): Promise<Walk<LibraryMusing>> =>
      walk(
        nextToken =>
          getAdminClient().models.BlogPost.list({
            limit: PAGE_SIZE,
            nextToken,
            selectionSet: ['id', 'title', 'content', 'published'],
          }),
        MAX_MUSINGS,
      ),
  });

export interface GalleryRef {
  id: string;
  name: string;
  /** True when the gallery uses this image as its thumbnail. */
  isThumbnail: boolean;
}

export interface MusingRef {
  id: string;
  title: string;
  published: boolean;
}

export interface ImageUsage {
  galleries: GalleryRef[];
  musings: MusingRef[];
  /** Nothing refers to it: no gallery, no gallery thumbnail, no musing. */
  isOrphan: boolean;
}

/** A musing naming a key no image row owns — the mirror of an orphan. */
export interface BrokenReference {
  key: string;
  musings: MusingRef[];
}

export interface LibraryAudit {
  usage: Map<string, ImageUsage>;
  brokenReferences: BrokenReference[];
}

/**
 * Every key an image can be referred to by.
 *
 * Musing markdown holds the original's key for older posts and the display
 * copy's for newer ones, and `extractImageKeys` already maps what it returns
 * through `toServedKey`. Indexing an image under both forms is what makes the
 * two sides comparable — match on the raw strings instead and every image
 * looks like an orphan.
 */
function keysFor(image: LibraryImage): string[] {
  const keys = [image.s3Key, toServedKey(image.s3Key)];
  if (image.s3DisplayKey) keys.push(image.s3DisplayKey);
  return keys;
}

/**
 * Derives what refers to each image. Pure over already-fetched rows: the
 * function that decides what may be deleted is testable without a component.
 */
export function auditLibrary(
  images: LibraryImage[],
  galleries: LibraryGallery[],
  membershipsByImage: Map<string, string[]>,
  musings: LibraryMusing[],
): LibraryAudit {
  const galleriesById = new Map(galleries.map(gallery => [gallery.id, gallery]));

  const imageIdByKey = new Map<string, string>();
  for (const image of images) {
    for (const key of keysFor(image)) imageIdByKey.set(key, image.id);
  }

  const musingsByImageId = new Map<string, MusingRef[]>();
  const musingsByUnknownKey = new Map<string, MusingRef[]>();
  for (const musing of musings) {
    const ref: MusingRef = { id: musing.id, title: musing.title, published: musing.published };
    for (const key of extractImageKeys(musing.content)) {
      const imageId = imageIdByKey.get(key);
      const bucket = imageId ? musingsByImageId : musingsByUnknownKey;
      const at = imageId ?? key;
      bucket.set(at, [...(bucket.get(at) ?? []), ref]);
    }
  }

  const usage = new Map<string, ImageUsage>();
  for (const image of images) {
    const galleryRefs: GalleryRef[] = [];
    for (const galleryId of membershipsByImage.get(image.id) ?? []) {
      const gallery = galleriesById.get(galleryId);
      if (gallery) galleryRefs.push({ id: gallery.id, name: gallery.name, isThumbnail: false });
    }
    // A gallery can use an image as its thumbnail without the image being a
    // member of it, so this is a separate pass rather than a flag on the above.
    for (const gallery of galleries) {
      if (gallery.thumbnailImageId !== image.id) continue;
      const existing = galleryRefs.find(ref => ref.id === gallery.id);
      if (existing) existing.isThumbnail = true;
      else galleryRefs.push({ id: gallery.id, name: gallery.name, isThumbnail: true });
    }

    const musingRefs = musingsByImageId.get(image.id) ?? [];
    usage.set(image.id, {
      galleries: galleryRefs,
      musings: musingRefs,
      isOrphan: galleryRefs.length === 0 && musingRefs.length === 0,
    });
  }

  const brokenReferences = [...musingsByUnknownKey].map(([key, refs]) => ({ key, musings: refs }));
  brokenReferences.sort((a, b) => a.key.localeCompare(b.key));

  return { usage, brokenReferences };
}
