import { useAuth } from '@/context/AuthContext';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import type { Schema } from '../../../../../amplify/data/resource';
import styles from './GalleryEditor.module.css';

interface GalleryEditorProps {
  galleryId: string;
}

interface ImageWithDetails {
  galleryImage: Schema['GalleryImage']['type'];
  image: Schema['Image']['type'];
  thumbnailUrl?: string;
}

interface SortableImageItemProps {
  imageItem: ImageWithDetails;
  index: number;
  isGalleryThumbnail: boolean;
  onThumbnailToggle: (imageId: string) => void;
}

const SortableImageItem = ({ imageItem, index, isGalleryThumbnail, onThumbnailToggle }: SortableImageItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: imageItem.galleryImage.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag from starting
    onThumbnailToggle(imageItem.image.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableItem} ${isDragging ? styles.dragging : ''} ${isGalleryThumbnail ? styles.thumbnailSelected : ''}`}
      {...attributes}
      {...listeners}>
      <div className={styles.dragHandle}>
        <i className='pi pi-bars' />
      </div>
      <div className={styles.thumbnailToggle}>
        <Button
          icon={isGalleryThumbnail ? 'pi pi-star-fill' : 'pi pi-star'}
          className={`${styles.thumbnailButton} ${isGalleryThumbnail ? styles.thumbnailButtonActive : ''}`}
          onClick={handleThumbnailClick}
          size='small'
          text
          tooltip={isGalleryThumbnail ? 'Current gallery thumbnail' : 'Set as gallery thumbnail'}
        />
      </div>
      <StorageImage
        path={imageItem.image.s3ThumbnailKey || imageItem.image.s3Key}
        alt={imageItem.image.title}
        className={styles.sortableItemImage}
        fallbackSrc='/placeholder-image.jpg'
      />
      <div className={styles.sortableItemFooter}>
        <p className={styles.sortableItemTitle}>{imageItem.image.title}</p>
        <div className={styles.orderNumber}>{index + 1}</div>
      </div>
    </div>
  );
};

const GalleryEditor = ({ galleryId }: GalleryEditorProps) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const toast = useRef<Toast>(null);
  const queryClient = useQueryClient();

  // Client for read operations (public API key)
  const clientRead = generateClient<Schema>({
    authMode: 'apiKey',
  });

  // Client for write operations (authenticated)
  const clientWrite = generateClient<Schema>({
    authMode: 'userPool',
  });

  const [sortedImages, setSortedImages] = useState<ImageWithDetails[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Fetch gallery details
  const {
    data: gallery,
    isLoading: isGalleryLoading,
    error: galleryError,
  } = useQuery({
    queryKey: ['gallery', galleryId],
    queryFn: async () => {
      try {
        const response = await clientRead.models.Gallery.get({ id: galleryId });
        return response.data;
      } catch (error) {
        console.error('Error fetching gallery:', error);
        throw error;
      }
    },
  });

  // Fetch gallery images with details
  const {
    data: galleryImages,
    isLoading: isImagesLoading,
    error: imagesError,
  } = useQuery({
    queryKey: ['galleryImagesWithDetails', galleryId],
    queryFn: async () => {
      try {
        const response = await clientRead.models.GalleryImage.list({
          filter: { galleryId: { eq: galleryId } },
        });
        const imagesWithDetails = await Promise.all(
          response.data?.map(async (galleryImage: Schema['GalleryImage']['type']) => {
            if (galleryImage.imageId) {
              const imageResponse = await clientRead.models.Image.get({ id: galleryImage.imageId });
              return {
                galleryImage,
                image: imageResponse.data,
              };
            }
            return null;
          }) || [],
        );

        const filteredImages = imagesWithDetails.filter(Boolean) as ImageWithDetails[];
        return filteredImages;
      } catch (error) {
        console.error('Error fetching gallery images:', error);
        throw error;
      }
    },
  });

  // Generate thumbnail URLs
  useEffect(() => {
    const generateThumbnailUrls = async () => {
      if (galleryImages && galleryImages.length > 0) {
        const imagesWithUrls = await Promise.all(
          galleryImages.map(async item => {
            if (!item?.image) return item;

            try {
              const thumbnailPath = item.image.s3ThumbnailKey || item.image.s3Key;
              const urlResult = await getUrl({ path: thumbnailPath });
              return {
                ...item,
                thumbnailUrl: urlResult.url.toString(),
              };
            } catch (error) {
              console.error('Error generating thumbnail URL:', error);
              return item;
            }
          }),
        );

        // Sort by order field, then by addedDate
        const sorted = imagesWithUrls.sort((a, b) => {
          const orderA = a.galleryImage.order ?? 999999;
          const orderB = b.galleryImage.order ?? 999999;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return new Date(a.galleryImage.addedDate).getTime() - new Date(b.galleryImage.addedDate).getTime();
        });

        setSortedImages(sorted);
      }
    };

    generateThumbnailUrls();
  }, [galleryImages]);

  // Mutation to update gallery thumbnail
  const updateThumbnailMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await clientWrite.models.Gallery.update({
        id: galleryId,
        thumbnailImageId: imageId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Gallery thumbnail updated successfully',
        life: 3000,
      });
    },
    onError: error => {
      console.error('Error updating thumbnail:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update gallery thumbnail',
        life: 5000,
      });
    },
  });

  // Mutation to update image order
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; order: number }[]) => {
      console.log('updating image order with updates:', updates);
      const promises = updates.map(async update => {
        try {
          const result = await clientWrite.models.GalleryImage.update({
            id: update.id,
            order: update.order,
          });
          return result;
        } catch (error) {
          console.error(`Error updating ${update.id}:`, error);
          throw error;
        }
      });
      const results = await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryImagesWithDetails', galleryId] });
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Image order updated successfully',
        life: 3000,
      });
    },
    onError: error => {
      console.error('Error updating order:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update image order',
        life: 5000,
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSortedImages(items => {
        const oldIndex = items.findIndex(item => item.galleryImage.id === active.id);
        const newIndex = items.findIndex(item => item.galleryImage.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleThumbnailToggle = (imageId: string) => {
    updateThumbnailMutation.mutate(imageId);
  };

  const handleSaveOrder = () => {
    const updates = sortedImages.map((item, index) => ({
      id: item.galleryImage.id,
      order: index + 1,
    }));
    updateOrderMutation.mutate(updates);
  };

  const activeImage = sortedImages.find(item => item.galleryImage.id === activeId);

  if (!isAuthenticated) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-lock'
          style={{ fontSize: '2rem' }}></i>
        <h3>Authentication Required</h3>
        <p>You must be logged in to edit galleries.</p>
        <Link to='/login'>
          <Button
            label='Login'
            icon='pi pi-sign-in'
            severity='info'
          />
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-ban'
          style={{ fontSize: '2rem' }}></i>
        <h3>Access Denied</h3>
        <p>You need admin privileges to edit galleries.</p>
        <Link to='/galleries'>
          <Button
            label='Back to Galleries'
            icon='pi pi-arrow-left'
            severity='secondary'
          />
        </Link>
      </div>
    );
  }

  if (isGalleryLoading || isImagesLoading) {
    return (
      <div className={styles.loadingContainer}>
        <ProgressSpinner />
        <p>Loading gallery editor...</p>
      </div>
    );
  }

  if (galleryError) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem' }}></i>
        <h3>Error loading gallery</h3>
        <p>Failed to load gallery: {galleryError.message}</p>
        <Link to='/galleries'>
          <Button
            label='Back to Galleries'
            icon='pi pi-arrow-left'
            severity='secondary'
          />
        </Link>
      </div>
    );
  }

  if (imagesError) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem' }}></i>
        <p>Error loading gallery images.</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem' }}></i>
        <h3>Gallery not found</h3>
        <p>Gallery with ID "{galleryId}" does not exist or you don't have access to it.</p>
        <Link to='/galleries'>
          <Button
            label='Back to Galleries'
            icon='pi pi-arrow-left'
            severity='secondary'
          />
        </Link>
      </div>
    );
  }

  if (!sortedImages.length) {
    return (
      <div className={styles.editorContainer}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Gallery: {gallery.name}</h2>
          <Link to='/galleries'>
            <Button
              label='Back to Galleries'
              icon='pi pi-arrow-left'
              className={styles.backButton}
              severity='secondary'
            />
          </Link>
        </div>
        <div className={styles.emptyContainer}>
          <i
            className='pi pi-images'
            style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          <h3>No Images Found</h3>
          <p>This gallery doesn't contain any images yet. Add some images first before editing.</p>
        </div>
        <Toast ref={toast} />
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Edit Gallery: {gallery.name}</h2>
        <Link to='/galleries'>
          <Button
            label='Back to Galleries'
            icon='pi pi-arrow-left'
            className={styles.backButton}
            severity='secondary'
          />
        </Link>
      </div>

      {/* Combined Drag and Drop Reorder + Thumbnail Selection */}
      <Card className={styles.reorderSection}>
        <h3 className={styles.sectionTitle}>
          <i className='pi pi-sort' />
          Reorder Images & Select Thumbnail
        </h3>
        <p className={styles.sectionDescription}>
          Drag and drop to reorder images. Click the star icon to set as gallery thumbnail.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedImages.map(item => item.galleryImage.id)}
            strategy={rectSortingStrategy}>
            <div className={styles.sortableGrid}>
              {sortedImages.map((item, index) => (
                <SortableImageItem
                  key={item.galleryImage.id}
                  imageItem={item}
                  index={index}
                  isGalleryThumbnail={gallery.thumbnailImageId === item.image.id}
                  onThumbnailToggle={handleThumbnailToggle}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId && activeImage ? (
              <div className={`${styles.sortableItem} ${styles.dragging}`}>
                <StorageImage
                  path={activeImage.image.s3ThumbnailKey || activeImage.image.s3Key}
                  alt={activeImage.image.title}
                  className={styles.sortableItemImage}
                  fallbackSrc='/placeholder-image.jpg'
                />
                <div className={styles.sortableItemFooter}>
                  <p className={styles.sortableItemTitle}>{activeImage.image.title}</p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <div className={styles.actionButtons}>
          <Button
            label='Save Order'
            icon='pi pi-save'
            onClick={handleSaveOrder}
            loading={updateOrderMutation.isPending}
          />
        </div>
      </Card>

      <Toast ref={toast} />
    </div>
  );
};

export default GalleryEditor;
