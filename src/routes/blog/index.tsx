import Blog from '@/modules/blog/Blog';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/')({
  component: Blog,
});
