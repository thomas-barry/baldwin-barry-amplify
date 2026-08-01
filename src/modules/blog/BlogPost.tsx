import Markdown from '@/components/Markdown';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ProgressSpinner } from 'primereact/progressspinner';
import styles from './BlogPost.module.css';
import { blogPostQueryOptions } from './queries';

const BlogPost = ({ postId }: { postId: string }) => {
  const { isAdmin } = useAuth();

  const { data: post, isLoading, isError } = useQuery(blogPostQueryOptions(postId));

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
          <Link
            to='/blog/$postId/edit'
            params={{ postId }}
            className='p-button p-component p-button-icon-only p-button-sm p-button-info p-button-rounded'
            aria-label='Edit post'>
            <span
              className='p-button-icon pi pi-pencil'
              aria-hidden='true'
            />
          </Link>
        )}
      </div>

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

        <Markdown>{post.content}</Markdown>
      </article>
    </div>
  );
};

export default BlogPost;
