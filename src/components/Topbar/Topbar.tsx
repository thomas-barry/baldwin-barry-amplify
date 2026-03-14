import AuthButton from '@/components/AuthButton';
import ThemeToggle from '@/components/ThemeToggle';
import { useRouterState } from '@tanstack/react-router';
import styles from './Topbar.module.css';

const ROUTE_LABELS: Record<string, string> = {
  '/photos': 'Photography',
  '/about': 'About',
  '/contact': 'Contact',
  '/admin': 'Admin',
  '/grid-demo': 'Grid Demo',
  '/components': 'Components',
};

const Topbar = () => {
  const pathname = useRouterState({ select: s => s.location.pathname });

  let pageLabel: string | null = null;
  if (pathname !== '/') {
    pageLabel = ROUTE_LABELS[pathname] ?? null;
    if (!pageLabel && pathname.startsWith('/photos/')) {
      pageLabel = 'Photography';
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles.siteName}>THOMAS BALDWIN BARRY</span>
        {pageLabel && (
          <>
            <span className={styles.separator} aria-hidden='true'>/</span>
            <span className={styles.pageTitle}>{pageLabel}</span>
          </>
        )}
      </div>
      <div className={styles.right}>
        <ThemeToggle />
        <AuthButton />
      </div>
    </header>
  );
};

export default Topbar;
