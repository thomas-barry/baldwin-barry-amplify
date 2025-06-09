import { generateClient } from 'aws-amplify/data';
import { useCallback, useState } from 'react';
import type { Schema } from '../../../../amplify/data/resource';
import { Gallery } from '../types';

/**
 * Custom hook for gallery form operations
 */
export const useGalleryForm = (onSuccess?: (gallery: Gallery) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editGallery, setEditGallery] = useState<Gallery | null>(null);

  const client = generateClient<Schema>();

  const openCreateForm = useCallback(() => {
    setEditGallery(null);
    setIsOpen(true);
  }, []);

  const openEditForm = useCallback((gallery: Gallery) => {
    setEditGallery(gallery);
    setIsOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  const handleSave = useCallback(
    async (gallery: Gallery) => {
      setIsLoading(true);
      setError(null);

      try {
        // For demonstration - this isn't needed as the form component handles the save
        // But this hook could be extended to handle the save operation if needed

        if (onSuccess) {
          onSuccess(gallery);
        }
      } catch (err) {
        console.error('Error saving gallery:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess],
  );

  const deleteGallery = useCallback(
    async (galleryId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await client.models.Gallery.delete({ id: galleryId });
      } catch (err) {
        console.error('Error deleting gallery:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete gallery');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client.models.Gallery],
  );

  return {
    isOpen,
    isLoading,
    error,
    editGallery,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSave,
    deleteGallery,
  };
};
