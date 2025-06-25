import { StorageImage } from '@aws-amplify/ui-react-storage';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import 'photoswipe/dist/photoswipe.css';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useEffect, useState } from 'react';
import { Gallery, Item } from 'react-photoswipe-gallery';
import type { Schema } from '../../../../../amplify/data/resource';
import styles from './GalleryThumbnails.module.css';

interface GalleryThumbnailsProps {
  galleryId: string;
}

interface ImageWithDetails {
  galleryImage: Schema['GalleryImage']['type'];
  image: Schema['Image']['type'];
  originalUrl?: string;
  thumbnailUrl?: string;
}

const GalleryThumbnails = ({ galleryId }: GalleryThumbnailsProps) => {
  const client = generateClient<Schema>();
  const [imagesWithUrls, setImagesWithUrls] = useState<ImageWithDetails[]>([]);

  const {
    data: galleryImages,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['galleryImagesWithDetails', galleryId],
    queryFn: async () => {
      // Get GalleryImage records with associated Image data
      const response = await client.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
      });

      // For each GalleryImage, fetch the associated Image details
      const imagesWithDetails = await Promise.all(
        response.data?.map(async galleryImage => {
          if (galleryImage.imageId) {
            const imageResponse = await client.models.Image.get({ id: galleryImage.imageId });
            return {
              galleryImage,
              image: imageResponse.data,
            };
          }
          return null;
        }) || [],
      );

      return imagesWithDetails.filter(Boolean);
    },
  });

  // Generate S3 URLs for images when data is loaded
  useEffect(() => {
    const generateUrls = async () => {
      if (galleryImages && galleryImages.length > 0) {
        const urlPromises = galleryImages.map(async item => {
          if (!item?.image) return null;

          try {
            const originalUrl = item.image.s3Key ? (await getUrl({ path: item.image.s3Key })).url.toString() : '';

            const thumbnailUrl = item.image.s3ThumbnailKey
              ? (await getUrl({ path: item.image.s3ThumbnailKey })).url.toString()
              : originalUrl; // Fallback to original if no thumbnail

            return {
              ...item,
              originalUrl,
              thumbnailUrl,
            };
          } catch (error) {
            console.error('Error generating URLs for image:', item.image.s3Key, error);
            return null;
          }
        });

        const resolvedImages = await Promise.all(urlPromises);
        setImagesWithUrls(resolvedImages.filter(Boolean) as ImageWithDetails[]);
      }
    };

    generateUrls();
  }, [galleryImages]);

  if (isLoading) {
    return (
      <Card className={styles.loadingCard}>
        <div className={styles.loadingContent}>
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
          <p>Loading images...</p>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={styles.errorCard}>
        <p>Error loading gallery images.</p>
      </Card>
    );
  }

  if (!galleryImages || galleryImages.length === 0) {
    return (
      <Card className={styles.emptyCard}>
        <div className={styles.emptyContent}>
          <i
            className='pi pi-image'
            style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          <p>No images in this gallery yet.</p>
        </div>
      </Card>
    );
  }

  if (imagesWithUrls.length === 0) {
    return (
      <Card className={styles.loadingCard}>
        <div className={styles.loadingContent}>
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
          <p>Preparing images...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={styles.galleryContainer}>
      <Gallery
        options={{
          // PhotoSwipe options
          bgOpacity: 0.9,
          showHideOpacity: true,
          closeOnVerticalDrag: true,
          loop: true,
          pinchToClose: false,
          allowPanToNext: false,
          returnFocus: false,
          // UI options
          arrowPrev: true,
          arrowNext: true,
          close: true,
          counter: true,
          // Animation
          showAnimationDuration: 333,
          hideAnimationDuration: 333,
        }}
        uiElements={[
          {
            name: 'bulletsIndicator',
            order: 9,
            isButton: false,
            appendTo: 'root',
            // PhotoSwipe instance type - using any due to complex PhotoSwipe typing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onInit: (el: HTMLElement, pswpInstance: any) => {
              // Custom UI element for image counter
              let prevIndex = -1;
              const updateCounter = () => {
                if (prevIndex !== pswpInstance.currIndex) {
                  prevIndex = pswpInstance.currIndex;
                  el.innerText = `${pswpInstance.currIndex + 1} / ${pswpInstance.getNumItems()}`;
                }
              };
              pswpInstance.on('change', updateCounter);
              pswpInstance.on('resize', updateCounter);
              updateCounter();
            },
          },
        ]}>
        <div className={styles.thumbnailsContainer}>
          {imagesWithUrls.map(item => {
            if (!item?.image?.s3Key || !item.originalUrl || !item.thumbnailUrl) return null;

            console.log('width', item.image.width, 'height', item.image.height);
            return (
              <Item
                key={item.galleryImage.id}
                original={item.originalUrl}
                thumbnail={item.thumbnailUrl}
                width={item.image.width || 1024}
                height={item.image.height || 768}
                alt={item.image.title || 'Gallery image'}
                cropped={true}>
                {({ ref, open }) => (
                  <div
                    ref={ref}
                    className={styles.thumbnailWrapper}
                    onClick={open}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // Trigger click event instead of calling open directly
                        e.currentTarget.click();
                      }
                    }}
                    role='button'
                    tabIndex={0}
                    aria-label={`View ${item.image.title || 'image'} in gallery`}>
                    <StorageImage
                      path={item.image.s3ThumbnailKey || item.image.s3Key}
                      alt={item.image.title || 'Gallery image'}
                      className={styles.thumbnail}
                      fallbackSrc='/placeholder-image.jpg'
                      onError={e => {
                        console.error('Error loading thumbnail:', e);
                      }}
                    />
                    <div className={styles.thumbnailOverlay}>
                      <i className='pi pi-search-plus' />
                    </div>
                  </div>
                )}
              </Item>
            );
          })}
        </div>
      </Gallery>
    </div>
  );
};

export default GalleryThumbnails;
