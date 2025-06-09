import { useAuth } from '@/context/AuthContext';
import { Authenticator } from '@aws-amplify/ui-react';
import { Navigate, useRouter } from '@tanstack/react-router';
import { ReactNode, useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({ children, requireAdmin = false, redirectTo = '/' }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication check is complete and user is not authenticated,
    // redirect to the specified path
    if (!isLoading && !isAuthenticated) {
      router.navigate({ to: redirectTo });
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  if (isLoading) {
    return <div>Loading authentication state...</div>;
  }

  // Handle admin route access
  if (requireAdmin && !isAdmin) {
    // If user is authenticated but not admin, redirect
    return <Navigate to={redirectTo} />;
  }

  // If authenticated (and admin if required), show the protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show auth form if not authenticated
  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <Authenticator />
    </div>
  );
};

export default ProtectedRoute;
