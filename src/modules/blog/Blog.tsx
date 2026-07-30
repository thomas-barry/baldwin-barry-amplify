import { useAuth } from '@/context/AuthContext';
import { Button } from 'primereact/button';
import styles from './Blog.module.css';
import BlogPostForm from './components/blog-post-form/BlogPostForm';
import BlogPostList from './components/blog-post-list/BlogPostList';
import { useBlogPostForm } from './hooks/useBlogPostForm';

const Blog = () => {
  const { isAdmin } = useAuth();
  const { isOpen, editPost, openCreateForm, openEditForm, closeForm } = useBlogPostForm();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeaderRow}>
        <div>
          <h1 className={styles.pageHeading}>Musings</h1>
        </div>
        {isAdmin && (
          <div className={styles.headerControls}>
            <Button
              label='New Post'
              icon='pi pi-plus'
              onClick={openCreateForm}
            />
          </div>
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

      <div className={styles.listWrapper}>
        <BlogPostList onEdit={isAdmin ? openEditForm : undefined} />
      </div>
    </div>
  );
};

export default Blog;
