import Complaints from '@/modules/complaints/Complaints';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/complaints/')({
  component: Complaints,
});
