import LoginDialog from '@/components/auth/LoginDialog';
import PageHeader from '@/components/PageHeader/PageHeader';
import Sidebar from '@/components/Sidebar';
import { LoginDialogProvider } from '@/context/LoginDialogContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import styles from './RootLayout.module.css';

const RootLayout = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { collapsed } = useSidebar();
  const isHome = pathname === '/';

  return (
    <LoginDialogProvider>
      <div className={styles.appLayout}>
        <Sidebar />
        <main className={styles.mainContent}>
          {!isHome && collapsed && <PageHeader />}
          <Outlet />
        </main>
      </div>
      <LoginDialog />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </LoginDialogProvider>
  );
};

export const Route = createRootRoute({
  component: () => (
    <SidebarProvider>
      <RootLayout />
    </SidebarProvider>
  ),
});
