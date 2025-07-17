import { ProgressSpinner } from 'primereact/progressspinner';
import { memo } from 'react';
import { default as ReactImageGallery, ReactImageGalleryItem } from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import { THUMBNAIL_PREFIX, UPLOADS_PREFIX } from '../../../../../constants';
import styles from './ImageGallery.module.css';

const CLOUDFRONT_DOMAIN = 'd3v1ijc4huf10a.cloudfront.net';

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
    description?: string | null;
    uploadDate: string;
    contentType?: string | null;
    width: number | null;
    height: number | null;
  };
}

interface ImageGalleryComponentProps {
  galleryImages: GalleryImage[];
  isLoading: boolean;
}

const ImageGalleryComponent = ({ galleryImages, isLoading }: ImageGalleryComponentProps) => {
  const galleryItems = galleryImages.map(galleryImage => ({
    original: galleryImage.image.s3Key,
    thumbnail: galleryImage.image.s3ThumbnailKey || galleryImage.image.s3Key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX),
    description: galleryImage.image.description || galleryImage.image.title || '',
    originalTitle: galleryImage.image.title,
    originalHeight: galleryImage.image.height || 0,
    originalWidth: galleryImage.image.width || 0,
  }));

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <ProgressSpinner />
        <p>Loading images...</p>
      </div>
    );
  }

  if (!galleryItems.length) {
    return (
      <div className={styles.emptyContainer}>
        <i
          className='pi pi-images'
          style={{ fontSize: '3rem', color: 'var(--gray-400)' }}></i>
        <h3>No Images Found</h3>
        <p>This gallery doesn't contain any images yet.</p>
      </div>
    );
  }

  console.log('RENDER');

  return (
    <div className={styles.galleryContainer}>
      <ReactImageGallery
        items={galleryItems}
        showThumbnails={true}
        showPlayButton={true}
        showFullscreenButton={true}
        showNav={true}
        autoPlay={false}
        slideInterval={5000}
        slideDuration={450}
        thumbnailPosition='bottom'
        useBrowserFullscreen={true}
        showBullets={false}
        showIndex={true}
        renderItem={(item: ReactImageGalleryItem) => (
          <div className={styles.imageItem}>
            <img
              src={`https://${CLOUDFRONT_DOMAIN}/${item.original}`}
              alt={item.originalTitle || item.description || 'Gallery image'}
              className={styles.galleryImage}
              loading='lazy'
            />
          </div>
        )}
        renderThumbInner={(item: ReactImageGalleryItem) => (
          <div className={styles.thumbnailContainer}>
            <img
              src={`https://${CLOUDFRONT_DOMAIN}/${item.thumbnail}`}
              alt={item.originalTitle || item.description || 'Gallery thumbnail'}
              className={`${styles.thumbnailImage} image-gallery-thumbnail`}
              loading='lazy'
            />
          </div>
        )}
      />
    </div>
  );
};

export default memo(ImageGalleryComponent);
