import { useAuth } from '@/context/AuthContext';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { ProgressSpinner } from 'primereact/progressspinner';
import styles from './BlogPost.module.css';
import BlogPostForm from './components/blog-post-form/BlogPostForm';
import { useBlogPostForm } from './hooks/useBlogPostForm';
import type { BlogPost as BlogPostType } from './types';

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });

const BlogPost = ({ postId }: { postId: string }) => {
  const { isAdmin } = useAuth();
  const { isOpen, editPost, openEditForm, closeForm } = useBlogPostForm();

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['blogPost', postId],
    queryFn: async () => {
      const response = await clientRead.models.BlogPost.get({ id: postId });
      return response.data as unknown as BlogPostType;
    },
  });

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <ProgressSpinner />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className={styles.errorContainer}>
        <i
          className='pi pi-exclamation-triangle'
          style={{ fontSize: '2rem', color: 'var(--red-500)' }}
        />
        <p>Post not found.</p>
        <Link
          to='/blog'
          className='p-button p-component p-button-text'>
          ← Back to Musings
        </Link>
      </div>
    );
  }

  const displayDate = post.publishedDate ?? post.createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tags = post.tags?.filter((t): t is string => t !== null) ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <Link
          to='/blog'
          className={styles.backLink}>
          <i className='pi pi-arrow-left' /> Back to Musings
        </Link>
        {isAdmin && (
          <button
            className='p-button p-component p-button-icon-only p-button-sm p-button-info p-button-rounded'
            aria-label='Edit post'
            onClick={() => openEditForm(post)}>
            <span
              className='p-button-icon pi pi-pencil'
              aria-hidden='true'
            />
          </button>
        )}
      </div>

      {isAdmin && (
        <BlogPostForm
          key={editPost?.id ?? 'new'}
          visible={isOpen}
          onHide={closeForm}
          initialValues={editPost ?? undefined}
          isEdit={!!editPost}
        />
      )}

      <article className={styles.article}>
        <header className={styles.articleHeader}>
          <h1 className={styles.title}>{post.title}</h1>
          <div className={styles.meta}>
            <time className={styles.date}>{formattedDate}</time>
            {tags.length > 0 && (
              <div className={styles.tags}>
                {tags.map(tag => (
                  <span
                    key={tag}
                    className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
};

export default BlogPost;
