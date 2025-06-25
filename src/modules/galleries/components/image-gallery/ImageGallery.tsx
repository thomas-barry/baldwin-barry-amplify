import { getUrl } from 'aws-amplify/storage';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useEffect, useState } from 'react';
import { default as ReactImageGallery, ReactImageGalleryItem } from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import styles from './ImageGallery.module.css';

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
  };
}

interface ImageGalleryComponentProps {
  galleryImages: GalleryImage[];
  isLoading: boolean;
}

const ImageGalleryComponent = ({ galleryImages, isLoading }: ImageGalleryComponentProps) => {
  const [galleryItems, setGalleryItems] = useState<ReactImageGalleryItem[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImageUrls = async () => {
      if (!galleryImages?.length) {
        setGalleryItems([]);
        return;
      }

      setIsLoadingUrls(true);
      setError(null);

      try {
        const items = await Promise.all(
          galleryImages.map(async galleryImage => {
            try {
              // Get the original image URL
              const originalUrlResult = await getUrl({
                path: galleryImage.image.s3Key,
                options: { expiresIn: 3600 }, // 1 hour
              });

              // Get thumbnail URL, fallback to original if no thumbnail
              let thumbnailUrl = originalUrlResult.url.toString();
              if (galleryImage.image.s3ThumbnailKey) {
                try {
                  const thumbnailUrlResult = await getUrl({
                    path: galleryImage.image.s3ThumbnailKey,
                    options: { expiresIn: 3600 },
                  });
                  thumbnailUrl = thumbnailUrlResult.url.toString();
                } catch (thumbnailError) {
                  console.warn('Failed to get thumbnail URL, using original:', thumbnailError);
                }
              }

              return {
                original: originalUrlResult.url.toString(),
                thumbnail: thumbnailUrl,
                description: galleryImage.image.description || galleryImage.image.title || '',
                originalTitle: galleryImage.image.title,
              } as ReactImageGalleryItem;
            } catch (error) {
              console.error('Failed to get URL for image:', galleryImage.image.s3Key, error);
              return null;
            }
          }),
        );

        // Filter out any failed items and ensure type safety
        const validItems: ReactImageGalleryItem[] = items.filter(
          (item): item is ReactImageGalleryItem => item !== null,
        );
        setGalleryItems(validItems);
      } catch (error) {
        console.error('Error loading image URLs:', error);
        setError('Failed to load images');
      } finally {
        setIsLoadingUrls(false);
      }
    };

    loadImageUrls();
  }, [galleryImages]);

  if (isLoading || isLoadingUrls) {
    return (
      <div className={styles.loadingContainer}>
        <ProgressSpinner />
        <p>Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem', color: 'var(--red-500)' }}></i>
        <p>{error}</p>
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
        lazyLoad={true}
        renderItem={(item: ReactImageGalleryItem) => (
          <div className={styles.imageItem}>
            <img
              src={item.original}
              alt={item.originalTitle || item.description || 'Gallery image'}
              className={styles.galleryImage}
              loading='lazy'
            />
            {item.description && <div className={styles.imageDescription}>{item.description}</div>}
          </div>
        )}
        renderThumbInner={(item: ReactImageGalleryItem) => (
          <div className={styles.thumbnailContainer}>
            <img
              src={item.thumbnail}
              alt={item.originalTitle || 'Thumbnail'}
              className={styles.thumbnailImage}
              loading='lazy'
            />
          </div>
        )}
      />
    </div>
  );
};

export default ImageGalleryComponent;
