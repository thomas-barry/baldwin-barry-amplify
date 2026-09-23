import { iconClass } from '@/components/Icon';
import { LinkButton } from '@/components/LinkButton';
import { useAuth } from '@/context/AuthContext';
import { stripMarkdown } from '@/lib/markdown';
import { Link } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import type { MouseEvent } from 'react';
import type { BlogPost } from '../../types';
import styles from './BlogPostCard.module.css';

interface BlogPostCardProps {
  post: BlogPost;
  onDelete?: (post: BlogPost) => void;
}

const BlogPostCard = ({ post, onDelete }: BlogPostCardProps) => {
  const { isAdmin } = useAuth();

  const excerpt = post.excerpt ?? stripMarkdown(post.content).slice(0, 160);

  const displayDate = post.publishedDate ?? post.createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tags = post.tags?.filter((t): t is string => t !== null) ?? [];

  const handleDelete = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(post);
  };

  return (
    <article className={styles.card}>
      {/* Only drafts get a header, so published cards carry no empty strip. */}
      {isAdmin && !post.published && (
        <div className={styles.cardHeader}>
          <span className={styles.draftBadge}>Draft</span>
        </div>
      )}
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link
            to='/blog/$postId'
            params={{ postId: post.id }}
            className={styles.cardLink}>
            {post.title || 'Untitled draft'}
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
          {/* In line with the date, pushed to the row's far end. Text buttons:
              in the metadata row they should read as quiet controls. */}
          {isAdmin && (
            <div className={styles.adminOverlay}>
              <LinkButton
                to='/blog/$postId/edit'
                params={{ postId: post.id }}
                icon='pencil'
                iconOnly
                rounded
                variant='text'
                size='small'
                severity='info'
                aria-label='Edit post'
              />
              {onDelete && (
                <Button
                  icon={iconClass('trash')}
                  rounded
                  text
                  severity='danger'
                  size='small'
                  aria-label='Delete post'
                  onClick={handleDelete}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;
