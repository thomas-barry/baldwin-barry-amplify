import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import type { Schema } from '../../../../../amplify/data/resource';
import AmplifyFileUploader from '../amplify-file-uploader/AmplifyFileUploader';
import ImageGalleryComponent from '../image-gallery/ImageGallery';

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const { isAdmin } = useAuth();
  const toast = useRef<Toast>(null);
  const queryClient = useQueryClient();

  const clientApiKey = generateClient<Schema>({
    authMode: 'apiKey',
  });

  const { data: galleryImages, isLoading } = useQuery({
    queryKey: ['galleryImages', galleryId],
    queryFn: async () => {
      // Query GalleryImage records for this specific gallery with related Image data
      const response = await clientApiKey.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
        selectionSet: ['id', 'galleryId', 'imageId', 'addedDate', 'order', 'image.*'],
      });

      // Sort by order field (nulls last), then by addedDate
      const sortedData = response.data?.sort((a, b) => {
        // Handle null/undefined order values - put them at the end
        if (a.order === null && b.order === null) return 0;
        if (a.order === null) return 1;
        if (b.order === null) return -1;

        // If both have order values, sort by order
        if (a.order !== b.order) {
          return a.order - b.order;
        }

        // If order values are the same, sort by addedDate as fallback
        return new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
      });

      return sortedData;
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
          {isAdmin && (
            <Link
              to='/galleries/$galleryId/edit'
              params={{ galleryId }}
              style={{ marginLeft: '12px' }}>
              <Button
                icon='pi pi-pencil'
                size='small'
                severity='info'
                tooltip='Edit Gallery'
                aria-label='Edit Gallery'
              />
            </Link>
          )}
        </div>
      </div>
      {isAdmin && (
        <AmplifyFileUploader
          onUploadSuccess={onUploadSuccess}
          galleryId={galleryId}
        />
      )}

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
