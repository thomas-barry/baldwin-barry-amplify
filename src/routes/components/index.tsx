import Components from '@/modules/components/Components';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/components/')({
  component: Components,
});
