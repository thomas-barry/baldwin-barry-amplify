import { LinkButton } from '@/components/LinkButton';
import { useAuth } from '@/context/AuthContext';
import styles from './Blog.module.css';
import BlogPostList from './components/blog-post-list/BlogPostList';

const Blog = () => {
  const { isAdmin } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeaderRow}>
        <div>
          <h1 className={styles.pageHeading}>Musings</h1>
        </div>
        {isAdmin && (
          <div className={styles.headerControls}>
            <LinkButton
              to='/blog/new'
              icon='plus'
              label='New Post'
            />
          </div>
        )}
      </div>

      <div className={styles.listWrapper}>
        <BlogPostList />
      </div>
    </div>
  );
};

export default Blog;
