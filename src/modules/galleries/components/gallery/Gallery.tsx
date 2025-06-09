import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import type { Schema } from '../../../../../amplify/data/resource';
import AmplifyFileUploader from '../amplify-file-uploader/AmplifyFileUploader';

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const { isAdmin } = useAuth();
  const toast = useRef<Toast>(null);
  const client = generateClient<Schema>();
  const queryClient = useQueryClient();

  const { data: galleryImages, isLoading } = useQuery({
    queryKey: ['galleryImages', galleryId],
    queryFn: async () => {
      // Query GalleryImage records for this specific gallery
      const response = await client.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
      });
      return response.data;
    },
  });

  // Query to get the gallery details (including name)
  const { data: gallery, isLoading: isGalleryLoading } = useQuery({
    queryKey: ['gallery', galleryId],
    queryFn: async () => {
      const response = await client.models.Gallery.get({ id: galleryId });
      return response.data;
    },
  });

  // Calculate the number of images in this gallery
  const imageCount = galleryImages?.length || 0;

  const onUploadSuccess = async (event: { key?: string; fileType?: string }) => {
    try {
      if (!event.key) {
        throw new Error('Upload succeeded but no file key was returned');
      }

      // Extract filename from the key (removing the path)
      const filename = event.key.split('/').pop() || 'Untitled';

      // 1. Create Image record
      const newImage = await client.models.Image.create({
        title: filename,
        s3Key: event.key,
        uploadDate: new Date().toISOString(),
        contentType: event.fileType || 'image/jpeg', // Default if not provided
        // Add other optional fields as needed
      });

      // 2. Create GalleryImage association if we have an image ID
      if (newImage.data?.id) {
        await client.models.GalleryImage.create({
          galleryId: galleryId,
          imageId: newImage.data.id,
          addedDate: new Date().toISOString(),
          order: 0, // Default ordering
        });

        console.log('Image associated with gallery:', {
          galleryId,
          imageId: newImage.data.id,
        });
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
      <Toast ref={toast} />
    </div>
  );
};

export default Gallery;
