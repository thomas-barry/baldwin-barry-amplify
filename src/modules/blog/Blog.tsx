import { useAuth } from '@/context/AuthContext';
import { Link } from '@tanstack/react-router';
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
            <Link
              to='/blog/new'
              className='p-button p-component'>
              <span
                className='p-button-icon pi pi-plus p-button-icon-left'
                aria-hidden='true'
              />
              <span className='p-button-label'>New Post</span>
            </Link>
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
