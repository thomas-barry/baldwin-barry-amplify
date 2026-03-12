import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
import { Navigate } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import { useEffect } from 'react';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { openLogin } = useLoginDialog();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openLogin();
    }
  }, [isLoading, isAuthenticated, openLogin]);

  // If already authenticated, redirect to home
  if (!isLoading && isAuthenticated) {
    return <Navigate to='/' />;
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1>Sign In</h1>
        <p>The login dialog has been opened. If it is not visible, use the button below.</p>
        <Button
          label='Open Login Dialog'
          icon='pi pi-sign-in'
          onClick={openLogin}
        />
      </div>
    </div>
  );
};

export default LoginPage;
