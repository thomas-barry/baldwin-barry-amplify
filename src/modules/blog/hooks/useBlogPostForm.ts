import { useCallback, useState } from 'react';
import type { BlogPost } from '../types';

export const useBlogPostForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);

  const openCreateForm = useCallback(() => {
    setEditPost(null);
    setIsOpen(true);
  }, []);

  const openEditForm = useCallback((post: BlogPost) => {
    setEditPost(post);
    setIsOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, editPost, openCreateForm, openEditForm, closeForm };
};
