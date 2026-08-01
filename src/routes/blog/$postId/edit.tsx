import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import BlogPostForm from '@/modules/blog/components/blog-post-form/BlogPostForm';
import { blogPostQueryOptions } from '@/modules/blog/queries';
import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ProgressSpinner } from 'primereact/progressspinner';

export const Route = createFileRoute('/blog/$postId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { postId } = Route.useParams();

  return (
    <ProtectedRoute requireAdmin>
      <Editor postId={postId} />
    </ProtectedRoute>
  );
}

/**
 * Split out so the fetch only runs once the admin check has passed, and so the
 * form mounts with its initial values already in hand — its state is seeded
 * from props, and remounting it later would discard whatever had been typed.
 */
function Editor({ postId }: { postId: string }) {
  const { data: post, isLoading, isError } = useQuery(blogPostQueryOptions(postId));

  if (isLoading) {
    return <ProgressSpinner />;
  }

  if (isError || !post) {
    return (
      <div>
        <p>Post not found.</p>
        <Link
          to='/blog'
          className='p-button p-component p-button-text'>
          ← Back to Musings
        </Link>
      </div>
    );
  }

  return (
    <BlogPostForm
      initialValues={post}
      isEdit
    />
  );
}
