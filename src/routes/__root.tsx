import LoginDialog from '@/components/auth/LoginDialog';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import { LoginDialogProvider } from '@/context/LoginDialogContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import styles from './RootLayout.module.css';

const RootLayout = () => (
  <LoginDialogProvider>
    <div className={styles.appLayout}>
      <Sidebar />
      <main className={styles.mainContent}>
        <Topbar />
        <Outlet />
      </main>
    </div>
    <LoginDialog />
    {import.meta.env.DEV && <TanStackRouterDevtools />}
  </LoginDialogProvider>
);

export const Route = createRootRoute({
  component: () => (
    <SidebarProvider>
      <RootLayout />
    </SidebarProvider>
  ),
});
