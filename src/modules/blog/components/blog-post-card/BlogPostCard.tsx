import { useAuth } from '@/context/AuthContext';
import { Link } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import type { BlogPost } from '../../types';
import styles from './BlogPostCard.module.css';

interface BlogPostCardProps {
  post: BlogPost;
  onEdit?: (post: BlogPost) => void;
  onDelete?: (post: BlogPost) => void;
}

const BlogPostCard = ({ post, onEdit, onDelete }: BlogPostCardProps) => {
  const { isAdmin } = useAuth();

  const excerpt = post.excerpt ?? post.content.replace(/<[^>]+>/g, '').slice(0, 160);

  const displayDate = post.publishedDate ?? post.createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tags = post.tags?.filter((t): t is string => t !== null) ?? [];

  const handleEdit = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(post);
  };

  const handleDelete = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(post);
  };

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        {isAdmin && !post.published && <span className={styles.draftBadge}>Draft</span>}
        {isAdmin && (
          <div className={styles.adminOverlay}>
            {onEdit && (
              <button
                className='p-button p-component p-button-icon-only p-button-sm p-button-info p-button-rounded'
                aria-label='Edit post'
                onClick={handleEdit}>
                <span
                  className='p-button-icon pi pi-pencil'
                  aria-hidden='true'
                />
              </button>
            )}
            {onDelete && (
              <button
                className='p-button p-component p-button-icon-only p-button-sm p-button-danger p-button-rounded'
                aria-label='Delete post'
                onClick={handleDelete}>
                <span
                  className='p-button-icon pi pi-trash'
                  aria-hidden='true'
                />
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link
            to='/blog/$postId'
            params={{ postId: post.id }}
            className={styles.cardLink}>
            {post.title}
          </Link>
        </h3>
        <p className={styles.cardExcerpt}>{excerpt}</p>
        <div className={styles.cardMeta}>
          <span className={styles.cardDate}>{formattedDate}</span>
          {tags.length > 0 && (
            <div className={styles.cardTags}>
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
      </div>
    </article>
  );
};

export default BlogPostCard;
