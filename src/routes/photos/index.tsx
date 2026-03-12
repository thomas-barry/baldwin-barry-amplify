import Galleries from '@/modules/galleries/Galleries';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/photos/')({
  component: Galleries,
});
