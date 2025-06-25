import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import type { Schema } from '../../../../../amplify/data/resource';
import AmplifyFileUploader from '../amplify-file-uploader/AmplifyFileUploader';
import ImageGalleryComponent from '../image-gallery/ImageGallery';

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const { isAdmin } = useAuth();
  const toast = useRef<Toast>(null);
  // Use userPool for mutations (create/update/delete) - requires authentication
  const clientUserPool = generateClient<Schema>({
    authMode: 'userPool',
  });
  // Use apiKey for queries (read) - allows public access
  const clientApiKey = generateClient<Schema>({
    authMode: 'apiKey',
  });
  const queryClient = useQueryClient();

  const { data: galleryImages, isLoading } = useQuery({
    queryKey: ['galleryImages', galleryId],
    queryFn: async () => {
      // Query GalleryImage records for this specific gallery with related Image data
      const response = await clientApiKey.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
        selectionSet: ['id', 'galleryId', 'imageId', 'addedDate', 'order', 'image.*'],
      });
      return response.data;
    },
  });

  // Query to get the gallery details (including name)
  const { data: gallery, isLoading: isGalleryLoading } = useQuery({
    queryKey: ['gallery', galleryId],
    queryFn: async () => {
      const response = await clientApiKey.models.Gallery.get({ id: galleryId });
      return response.data;
    },
  });

  // Calculate the number of images in this gallery
  const imageCount = galleryImages?.length || 0;

  const onUploadSuccess = async (event: { key?: string; fileType?: string }) => {
    console.log('ON UPLOAD SUCCESS', event.key);
    console.log('Current user auth status:', { isAdmin });

    try {
      // Check if user is authenticated
      const currentUser = await getCurrentUser();
      console.log('Current authenticated user:', currentUser);

      if (!currentUser) {
        throw new Error('User must be authenticated to upload images');
      }

      if (!event.key) {
        throw new Error('Upload succeeded but no file key was returned');
      }

      // Extract filename from the key (removing the path)
      const filename = event.key.split('/').pop() || 'Untitled';

      // Generate thumbnail key by replacing 'uploads/' with 'thumbnails/'
      const thumbnailKey = event.key.replace('uploads/', 'thumbnails/');

      // 1. Create Image record
      console.log('Creating image record with key:', event.key);
      console.log('Image creation payload:', {
        title: filename,
        s3Key: event.key,
        s3ThumbnailKey: thumbnailKey,
        uploadDate: new Date().toISOString(),
        contentType: event.fileType || 'image/jpeg',
      });

      const newImage = await clientUserPool.models.Image.create({
        title: filename,
        s3Key: event.key,
        s3ThumbnailKey: thumbnailKey,
        uploadDate: new Date().toISOString(),
        contentType: event.fileType || 'image/jpeg', // Default if not provided
        // Add other optional fields as needed
      });

      console.log('Image creation response:', newImage);
      console.log('Image creation errors:', newImage.errors);

      if (newImage.errors && newImage.errors.length > 0) {
        throw new Error(
          `Image creation failed: ${newImage.errors.map((e: { message: string }) => e.message).join(', ')}`,
        );
      }

      if (!newImage.data) {
        throw new Error('Image creation succeeded but no data was returned');
      }

      // 2. Create GalleryImage association if we have an image ID
      console.log('Creating gallery image association for gallery:', galleryId);
      console.log('New image data:', newImage.data?.id);
      if (newImage.data?.id) {
        const galleryImageResult = await clientUserPool.models.GalleryImage.create({
          galleryId: galleryId,
          imageId: newImage.data.id,
          addedDate: new Date().toISOString(),
          order: 0, // Default ordering
        });

        console.log('GalleryImage creation response:', galleryImageResult);
        console.log('GalleryImage creation errors:', galleryImageResult.errors);

        if (galleryImageResult.errors && galleryImageResult.errors.length > 0) {
          throw new Error(
            `GalleryImage creation failed: ${galleryImageResult.errors.map((e: { message: string }) => e.message).join(', ')}`,
          );
        }

        console.log('Image associated with gallery:', {
          galleryId,
          imageId: newImage.data.id,
        });
      } else {
        throw new Error('Image creation succeeded but no ID was returned');
      }

      // Update state and show success message
      queryClient.invalidateQueries({ queryKey: ['galleryImages', galleryId] });
      toast.current?.show({
        severity: 'success',
        summary: 'Upload Complete',
        detail: 'Image uploaded and added to gallery',
        life: 3000,
      });
    } catch (error) {
      console.error('Error creating image records:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Record Creation Failed',
        detail: error instanceof Error ? error.message : 'Failed to create image records',
        life: 5000,
      });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
        }}>
        <h3 style={{ margin: 0, color: '#495057' }}>
          {isGalleryLoading ? 'Loading...' : gallery?.name || 'Gallery Images'}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#6c757d',
          }}>
          <i
            className='pi pi-images'
            style={{ fontSize: '16px' }}></i>
          <span>{isLoading ? 'Loading...' : `${imageCount} image${imageCount !== 1 ? 's' : ''}`}</span>
        </div>
      </div>
      {isAdmin && <AmplifyFileUploader onUploadSuccess={onUploadSuccess} />}

      {/* Image Gallery Display */}
      <ImageGalleryComponent
        galleryImages={galleryImages || []}
        isLoading={isLoading}
      />

      <Toast ref={toast} />
    </div>
  );
};

export default Gallery;
