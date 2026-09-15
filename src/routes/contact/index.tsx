import Complaints from '@/modules/complaints/Complaints';
import { createFileRoute } from '@tanstack/react-router';

// The route stays /contact so existing links keep working; the page behind it
// is the Complaints Department.
export const Route = createFileRoute('/contact/')({
  component: Complaints,
});
