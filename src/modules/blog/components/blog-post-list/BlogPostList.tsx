import { useAuth } from '@/context/AuthContext';
import type { Schema } from '@/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useMemo } from 'react';
import type { BlogPost } from '../../types';
import BlogPostCard from '../blog-post-card/BlogPostCard';
import styles from './BlogPostList.module.css';

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });
const clientWrite = generateClient<Schema>({ authMode: 'userPool' });

const BlogPostList = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['blogPosts', isAdmin],
    queryFn: async () => {
      const filter = isAdmin ? undefined : { published: { eq: true } };
      const response = await clientRead.models.BlogPost.list({ filter });
      return response.data as unknown as BlogPost[];
    },
  });

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
      return clientWrite.models.BlogPost.delete({ id: postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
    },
    onError: err => {
      console.error('Error deleting blog post:', err);
    },
  });

  const handleDelete = (post: BlogPost) => {
    if (window.confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(post.id);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <ProgressSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem', color: 'var(--red-500)' }}
        />
        <p>Error loading posts: {error?.message ?? 'Unknown error'}</p>
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
    <div className={styles.postGrid}>
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
