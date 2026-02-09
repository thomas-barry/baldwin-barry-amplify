import LoginDialog from '@/components/auth/LoginDialog';
import NavBar from '@/components/navbar/NavBar';
import { LoginDialogProvider } from '@/context/LoginDialogContext';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import styles from './RootLayout.module.css';

export const Route = createRootRoute({
  component: () => (
    <LoginDialogProvider>
      <NavBar />
      <div className={styles.pageGridContainer}>
        <div className={styles.mainContent}>
          <Outlet />
        </div>
      </div>
      <LoginDialog />
      <TanStackRouterDevtools />
    </LoginDialogProvider>
  ),
});
