import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
});

function AdminPage() {
  const { username } = useAuth();

  return (
    <ProtectedRoute
      requireAdmin={true}
      redirectTo='/login'>
      <div style={{ padding: '20px' }}>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {username || 'admin'}! This page is only accessible to users with admin privileges.</p>

        <div style={{ marginTop: '20px' }}>
          <h2>Admin Functions</h2>
          <ul>
            <li>User Management</li>
            <li>Content Moderation</li>
            <li>System Settings</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}
