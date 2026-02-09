import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
import { Navigate } from '@tanstack/react-router';
import { ReactNode, useEffect } from 'react';
import styles from './ProtectedRoute.module.css';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({ children, requireAdmin = false, redirectTo = '/' }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const { openLogin } = useLoginDialog();
  useEffect(() => {
    // If authentication check is complete and user is not authenticated,
    // trigger the login dialog.
    if (!isLoading && !isAuthenticated) {
      openLogin();
    }
  }, [isLoading, isAuthenticated, openLogin]);

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

  // Show a prompt if not authenticated
  return (
    <div className={styles.prompt}>
      <h3>Authentication Required</h3>
      <p>Please sign in to continue.</p>
      <button
        type='button'
        onClick={openLogin}>
        Open Login Dialog
      </button>
    </div>
  );
};

export default ProtectedRoute;
