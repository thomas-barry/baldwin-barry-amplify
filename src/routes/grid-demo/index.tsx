import GridDemo from '@/modules/grid-demo/GridDemo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/grid-demo/')({
  component: GridDemo,
});
