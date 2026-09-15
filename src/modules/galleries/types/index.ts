import type { SquareSelection } from '@/components/ImageSquareSelector';

export interface Gallery {
  id: string;
  name: string;
  description: string | null;
  createdDate: string;
  updatedAt?: string | null;
  thumbnailImageId?: string | null;
  thumbnailImage?: {
    id: string;
    title: string;
    s3Key: string;
    s3ThumbnailKey?: string | null;
    s3DisplayKey?: string | null;
    description?: string | null;
    uploadDate: string;
    fileName: string;
    fileSize?: number | null;
    width?: number | null;
    height?: number | null;
    contentType?: string | null;
  } | null;
  images?: { id: string }[] | null;
  /** Set by the public list, which does not return the memberships themselves. */
  photoCount?: number | null;
  thumbnailCrop?: SquareSelection | null;
  adminOnly?: boolean | null;
}

/** A gallery membership joined to its image, as the carousel renders it. */
export interface GalleryPhoto {
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

export interface GalleryView {
  gallery: Gallery;
  images: GalleryPhoto[];
}
