import { useCallback, useState } from 'react';
import { Gallery } from '../types';

export const useGalleryForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editGallery, setEditGallery] = useState<Gallery | null>(null);

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
  }, []);

  return { isOpen, editGallery, openCreateForm, openEditForm, closeForm };
};
