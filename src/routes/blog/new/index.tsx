import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import BlogPostForm from '@/modules/blog/components/blog-post-form/BlogPostForm';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProtectedRoute requireAdmin>
      <BlogPostForm />
    </ProtectedRoute>
  );
}
