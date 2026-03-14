import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
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
import { useNavigate } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { getUrl, remove, uploadData } from 'aws-amplify/storage';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import type { SquareSelection } from '@/components/ImageSquareSelector';
import AmplifyFileUploader from '../amplify-file-uploader/AmplifyFileUploader';
import ThumbnailCropDialog from '../thumbnail-crop-dialog/ThumbnailCropDialog';
import type { Schema } from '../../../../../amplify/data/resource';
import styles from './GalleryEditor.module.css';

interface GalleryEditorProps {
  galleryId: string;
}

interface ImageWithDetails {
  galleryImage: Schema['GalleryImage']['type'];
  image: Schema['Image']['type'];
  thumbnailUrl?: string;
  imageUrl?: string;
}

interface SortableImageItemProps {
  imageItem: ImageWithDetails;
  index: number;
  isGalleryThumbnail: boolean;
  onThumbnailToggle: (imageId: string) => void;
  onImageClick?: () => void;
  onDelete: (imageItem: ImageWithDetails) => void;
}

const SortableImageItem = ({ imageItem, index: _index, isGalleryThumbnail, onThumbnailToggle, onImageClick, onDelete }: SortableImageItemProps) => {
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

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClick?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(imageItem);
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
      <div className={styles.imageClickArea} onClick={handleImageClick}>
        <StorageImage
          path={imageItem.image.s3ThumbnailKey || imageItem.image.s3Key}
          alt={imageItem.image.title}
          className={styles.sortableItemImage}
          fallbackSrc='/placeholder-image.jpg'
        />
      </div>
      <div className={styles.sortableItemFooter}>
        <p className={styles.sortableItemTitle}>{imageItem.image.title}</p>
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          aria-label='Delete image'
          title='Delete image'
          type='button'
        >
          <i className='pi pi-trash' />
        </button>
      </div>
    </div>
  );
};

async function cropImageToBlob(imageUrl: string, crop: SquareSelection, outputSize = 200): Promise<Blob> {
  const response = await fetch(imageUrl);
  const imageBlob = await response.blob();
  const blobUrl = URL.createObjectURL(imageBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const srcX = crop.x * img.naturalWidth;
      const srcY = crop.y * img.naturalHeight;
      const srcSide = crop.size * img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcSide, srcSide, 0, 0, outputSize, outputSize);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
        'image/jpeg',
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Image load failed'));
    };
    img.src = blobUrl;
  });
}

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });
const clientWrite = generateClient<Schema>({ authMode: 'userPool' });

const GalleryEditor = ({ galleryId }: GalleryEditorProps) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { openLogin } = useLoginDialog();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const queryClient = useQueryClient();

  const [sortedImages, setSortedImages] = useState<ImageWithDetails[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cropDialogImage, setCropDialogImage] = useState<ImageWithDetails | null>(null);

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
              const [thumbnailResult, imageResult] = await Promise.all([
                getUrl({ path: thumbnailPath }),
                getUrl({ path: item.image.s3Key }),
              ]);
              return {
                ...item,
                thumbnailUrl: thumbnailResult.url.toString(),
                imageUrl: imageResult.url.toString(),
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

  // Mutation to save thumbnail with crop
  const saveCropMutation = useMutation({
    mutationFn: async ({ imageId, crop }: { imageId: string; crop: SquareSelection | null }) => {
      const imageItem = sortedImages.find(i => i.image.id === imageId);

      if (crop && imageItem?.imageUrl && imageItem.image.s3ThumbnailKey) {
        const blob = await cropImageToBlob(imageItem.imageUrl, crop);
        await uploadData({
          path: imageItem.image.s3ThumbnailKey,
          data: blob,
          options: { contentType: 'image/jpeg' },
        }).result;
      }

      return clientWrite.models.Gallery.update({
        id: galleryId,
        thumbnailImageId: imageId,
        thumbnailCrop: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      setCropDialogImage(null);
      toast.current?.show({ severity: 'success', summary: 'Thumbnail updated', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Failed to save thumbnail', life: 5000 });
    },
  });

  // Mutation to delete an image (S3 files + DynamoDB records)
  const deleteImageMutation = useMutation({
    mutationFn: async (imageItem: ImageWithDetails) => {
      const { image, galleryImage } = imageItem;
      const deletions: Promise<unknown>[] = [
        remove({ path: image.s3Key }),
        clientWrite.models.GalleryImage.delete({ id: galleryImage.id }),
        clientWrite.models.Image.delete({ id: image.id }),
      ];
      if (image.s3ThumbnailKey && image.s3ThumbnailKey !== image.s3Key) {
        deletions.push(remove({ path: image.s3ThumbnailKey }));
      }
      await Promise.all(deletions);
    },
    onSuccess: (_data, imageItem) => {
      setSortedImages(prev => prev.filter(i => i.galleryImage.id !== imageItem.galleryImage.id));
      queryClient.invalidateQueries({ queryKey: ['galleryImagesWithDetails', galleryId] });
      if (gallery?.thumbnailImageId === imageItem.image.id) {
        clientWrite.models.Gallery.update({ id: galleryId, thumbnailImageId: null });
        queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
      }
      toast.current?.show({ severity: 'success', summary: 'Image deleted', life: 3000 });
    },
    onError: () => {
      toast.current?.show({ severity: 'error', summary: 'Failed to delete image', life: 5000 });
    },
  });

  // Mutation to update image order
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; order: number }[]) => {
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

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['galleryImagesWithDetails', galleryId] });
    toast.current?.show({ severity: 'success', summary: 'Image uploaded', life: 3000 });
  };

  const activeImage = sortedImages.find(item => item.galleryImage.id === activeId);

  const backButton = (
    <Button
      label='Back to Galleries'
      icon='pi pi-arrow-left'
      severity='secondary'
      onClick={() => navigate({ to: '/photos' })}
    />
  );

  if (!isAuthenticated) {
    return (
      <div className={styles.errorContainer}>
        <i
          className={`pi pi-lock ${styles.errorIcon}`}></i>
        <h3>Authentication Required</h3>
        <p>You must be logged in to edit galleries.</p>
        <Button
          label='Login'
          icon='pi pi-sign-in'
          severity='info'
          onClick={openLogin}
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.errorContainer}>
        <i className={`pi pi-ban ${styles.errorIcon}`} />
        <h3>Access Denied</h3>
        <p>You need admin privileges to edit galleries.</p>
        {backButton}
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
        <i className={`pi pi-exclamation-triangle ${styles.errorIcon}`} />
        <h3>Error loading gallery</h3>
        <p>Failed to load gallery: {galleryError.message}</p>
        {backButton}
      </div>
    );
  }

  if (imagesError) {
    return (
      <div className={styles.errorContainer}>
        <i className={`pi pi-exclamation-triangle ${styles.errorIcon}`}></i>
        <p>Error loading gallery images.</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className={styles.errorContainer}>
        <i className={`pi pi-exclamation-triangle ${styles.errorIcon}`} />
        <h3>Gallery not found</h3>
        <p>Gallery with ID "{galleryId}" does not exist or you don't have access to it.</p>
        {backButton}
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Edit Gallery: {gallery.name}</h2>
        {backButton}
      </div>

      {/* Combined Drag and Drop Reorder + Thumbnail Selection */}
      {sortedImages.length > 0 && <Card className={styles.reorderSection}>
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
                  onImageClick={() => setCropDialogImage(item)}
                  onDelete={imageItem =>
                    confirmDialog({
                      message: `Delete "${imageItem.image.title}"? This will permanently remove the image and cannot be undone.`,
                      header: 'Delete Image',
                      icon: 'pi pi-exclamation-triangle',
                      acceptClassName: 'p-button-danger',
                      accept: () => deleteImageMutation.mutate(imageItem),
                    })
                  }
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
      </Card>}

      <Card className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>
          <i className='pi pi-upload' />
          Upload Images
        </h3>
        <p className={styles.sectionDescription}>
          Upload images to add them to this gallery.
        </p>
        <AmplifyFileUploader
          galleryId={galleryId}
          onUploadSuccess={handleUploadSuccess}
        />
      </Card>

      {cropDialogImage && (
        <ThumbnailCropDialog
          visible={!!cropDialogImage}
          onHide={() => setCropDialogImage(null)}
          imageUrl={cropDialogImage.imageUrl ?? ''}
          imageTitle={cropDialogImage.image.title}
          initialCrop={
            gallery.thumbnailImageId === cropDialogImage.image.id
              ? (gallery.thumbnailCrop as SquareSelection | null) ?? null
              : null
          }
          onSave={crop => saveCropMutation.mutate({ imageId: cropDialogImage.image.id, crop })}
          isSaving={saveCropMutation.isPending}
        />
      )}
      <Toast ref={toast} />
      <ConfirmDialog />
    </div>
  );
};

export default GalleryEditor;
