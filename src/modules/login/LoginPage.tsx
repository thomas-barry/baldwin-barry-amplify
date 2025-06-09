import { useAuth } from '@/context/AuthContext';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Navigate } from '@tanstack/react-router';
import { Card } from 'primereact/card';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // If already authenticated, redirect to home
  if (!isLoading && isAuthenticated) {
    return <Navigate to='/' />;
  }

  return (
    <div className={styles.loginContainer}>
      <Card>
        <h1>Sign In</h1>
        <Authenticator hideSignUp>
          {/* {() => (
            // This only renders after successful authentication
            <Navigate to='/' />
          )} */}
        </Authenticator>
      </Card>
    </div>
  );
};

export default LoginPage;
