import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Skeleton from '@/components/Skeleton';
import type { Schema } from '@/schema';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { useEffect, useRef, useState } from 'react';

const client = generateClient<Schema>({ authMode: 'userPool' });

export const Route = createFileRoute('/blog/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProtectedRoute requireAdmin>
      <CreateDraft />
    </ProtectedRoute>
  );
}

/**
 * A new musing gets a real row immediately, then the editor opens on it. That
 * keeps the editor a single "edit an existing post" path — pasting an image
 * needs a post id to hang the upload off, and there is no half-state to reason
 * about. The stub is empty (`title: ''`), so it fails save-validation until it
 * has a title, and BlogPostForm deletes it if the draft is abandoned untouched.
 */
function CreateDraft() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const { data, errors } = await client.models.BlogPost.create({
          title: '',
          content: '',
          excerpt: null,
          tags: null,
          published: false,
          publishedDate: null,
        });
        if (errors?.length || !data) throw new Error(errors?.[0]?.message ?? 'Could not create the draft');
        navigate({ to: '/blog/$postId/edit', params: { postId: data.id }, replace: true });
      } catch (error) {
        console.error('Could not start a new musing:', error);
        setFailed(true);
      }
    })();
  }, [navigate]);

  if (failed) {
    return <p>Could not start a new musing. Head back to Musings and try again.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <Skeleton
        width='60%'
        height='2rem'
      />
      <Skeleton height='2.75rem' />
      <Skeleton height='20rem' />
    </div>
  );
}
