export interface Gallery {
  id: string;
  name: string;
  description: string | null;
  createdDate: string;
  thumbnailImageId?: string | null;
  thumbnailImage?: {
    id: string;
    title: string;
    s3Key: string;
    s3ThumbnailKey?: string | null;
  } | null;
}
