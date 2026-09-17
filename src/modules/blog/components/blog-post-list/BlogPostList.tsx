import { Icon, iconClass } from '@/components/Icon';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { getAdminClient } from '@/lib/dataClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useMemo, useRef } from 'react';
import { blogPostsQueryOptions } from '../../queries';
import type { BlogPost } from '../../types';
import BlogPostCard from '../blog-post-card/BlogPostCard';
import styles from './BlogPostList.module.css';

const SKELETON_COUNT = 3;

const BlogPostList = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);

  const {
    data: posts,
    isLoading: isQueryLoading,
    isError,
    error,
    refetch,
  } = useQuery({ ...blogPostsQueryOptions(isAdmin), enabled: !isAuthLoading });
  const isLoading = isAuthLoading || isQueryLoading;

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => {
      const aDate = a.publishedDate ?? a.createdAt;
      const bDate = b.publishedDate ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [posts]);

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      return getAdminClient().models.BlogPost.delete({ id: postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
    },
    onError: err => {
      toast.current?.show({
        severity: 'error',
        summary: 'Delete failed',
        detail: err instanceof Error ? err.message : 'Could not delete the post.',
        life: 5000,
      });
    },
  });

  const handleDelete = (post: BlogPost) => {
    if (window.confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(post.id);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.postList}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={i}
            className={styles.skeletonCard}>
            <Skeleton
              width='60%'
              height='1.5rem'
            />
            <Skeleton
              width='90%'
              height='1rem'
            />
            <div className={styles.skeletonMeta}>
              <Skeleton
                width='6rem'
                height='0.875rem'
              />
              <Skeleton
                width='3rem'
                height='1.25rem'
                radius='var(--radius-sm)'
              />
              <Skeleton
                width='3rem'
                height='1.25rem'
                radius='var(--radius-sm)'
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.errorContainer}>
        <Icon
          name='exclamation-triangle'
          style={{ fontSize: 'var(--fs-800)', color: 'var(--color-destructive)' }}
        />
        <p>Error loading posts: {error?.message ?? 'Unknown error'}</p>
        <Button
          className={styles.retryButton}
          label='Try again'
          icon={iconClass('refresh')}
          outlined
          onClick={() => refetch()}
        />
      </div>
    );
  }

  if (!sortedPosts.length) {
    return (
      <Card
        className={styles.emptyStateCard}
        title='No Musings Mused'>
        {isAdmin && <p>No musings yet. Use &quot;New Post&quot; to create one.</p>}
      </Card>
    );
  }

  return (
    <div className={styles.postList}>
      <Toast ref={toast} />
      {sortedPosts.map(post => (
        <BlogPostCard
          key={post.id}
          post={post}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      ))}
    </div>
  );
};

export default BlogPostList;
