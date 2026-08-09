import LoginDialog from '@/components/auth/LoginDialog';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { LoginDialogProvider } from '@/context/LoginDialogContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import styles from './RootLayout.module.css';

/* The BarryFi routes are OAuth redirect targets shown in a popup window, not
   pages you navigate to — the sidebar and topbar have nothing to offer there. */
const isBarePath = (pathname: string) => pathname.startsWith('/barryfi/');

const RootLayout = () => {
  const isBare = useRouterState({ select: state => isBarePath(state.location.pathname) });

  if (isBare) {
    return (
      <>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </>
    );
  }

  return (
    <LoginDialogProvider>
      <div className={styles.appLayout}>
        {/* First tab stop on every page: the sidebar has six nav links plus a
            collapse button ahead of the content, and a keyboard user should not
            have to walk them on every navigation. */}
        <a
          href='#main-content'
          className={styles.skipLink}>
          Skip to content
        </a>
        <Sidebar />
        <main
          id='main-content'
          tabIndex={-1}
          className={styles.mainContent}>
          <Topbar />
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
