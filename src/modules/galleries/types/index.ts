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
    description?: string | null;
    uploadDate: string;
    fileName: string;
    fileSize?: number | null;
    width?: number | null;
    height?: number | null;
    contentType?: string | null;
  } | null;
  images?: { id: string }[] | null;
  thumbnailCrop?: SquareSelection | null;
  adminOnly?: boolean | null;
}
