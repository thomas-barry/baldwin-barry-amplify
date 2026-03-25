import Sandbox from '@/modules/sandbox/Sandbox';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sandbox/')({
  component: Sandbox,
});
