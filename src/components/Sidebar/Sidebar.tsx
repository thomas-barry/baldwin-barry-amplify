import facePalmImage from '@/assets/facepalm.jpg';
import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: 'pi pi-home', label: 'Home', exact: true },
  { to: '/photos', icon: 'pi pi-images', label: 'Photos' },
  { to: '/grid-demo', icon: 'pi pi-table', label: 'Grid Demo' },
];

const MOBILE_BREAKPOINT = 768;

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin', icon: 'pi pi-cog', label: 'Admin' },
];

const NavLink = ({
  item,
  showLabel,
  onClick,
}: {
  item: NavItem;
  showLabel: boolean;
  onClick?: () => void;
}) => (
  <Link
    to={item.to}
    className={styles.navItem}
    activeProps={{ className: styles.active }}
    activeOptions={{ exact: item.exact }}
    onClick={onClick}
  >
    <i className={`${item.icon} ${styles.navIcon}`} />
    {showLabel && <span className={styles.navLabel}>{item.label}</span>}
  </Link>
);

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isAdmin, username, logout } = useAuth();
  const { openLogin } = useLoginDialog();

  useEffect(() => {
    const width = collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)';
    document.documentElement.style.setProperty('--sidebar-current-width', width);
  }, [collapsed]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= MOBILE_BREAKPOINT) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuthAction = () => {
    if (isAuthenticated) logout();
    else openLogin();
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link to='/' className={styles.logoLink}>
              <img src={facePalmImage} alt='Thomas Baldwin Barry' className={styles.logo} />
              <div className={styles.logoText}>
                <span className={styles.logoName}>Thomas</span>
                <span className={styles.logoName}>Baldwin Barry</span>
              </div>
            </Link>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`pi ${collapsed ? 'pi-chevron-right' : 'pi-chevron-left'}`} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} item={item} showLabel={!collapsed} />
          ))}
          {isAdmin && (
            <>
              <div className={styles.divider} />
              {!collapsed && <span className={styles.navSection}>Admin</span>}
              {ADMIN_NAV_ITEMS.map(item => (
                <NavLink key={item.to} item={item} showLabel={!collapsed} />
              ))}
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.footerBtn} onClick={toggleTheme}>
            <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
            {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button className={styles.footerBtn} onClick={handleAuthAction}>
            <i className={`pi ${isAuthenticated ? 'pi-sign-out' : 'pi-sign-in'}`} />
            {!collapsed && <span>{isAuthenticated ? 'Sign out' : 'Sign in'}</span>}
          </button>
          {isAuthenticated && !collapsed && (
            <div className={styles.userInfo}>
              <span className={styles.username}>{username}</span>
              {isAdmin && <span className={styles.adminBadge}>admin</span>}
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className={styles.mobileTopBar}>
        <Link to='/' className={styles.mobileLogoLink} onClick={closeMobile}>
          <img src={facePalmImage} alt='Thomas Baldwin Barry' className={styles.mobileLogo} />
          <span className={styles.mobileTitle}>Thomas Baldwin Barry</span>
        </Link>
        <button className={styles.mobileIconBtn} onClick={toggleTheme} aria-label='Toggle theme'>
          <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
        </button>
        <button
          className={`${styles.mobileIconBtn} ${mobileOpen ? styles.mobileIconBtnActive : ''}`}
          onClick={() => setMobileOpen(o => !o)}
          aria-expanded={mobileOpen}
          aria-label='Open navigation menu'
        >
          <i className='pi pi-bars' />
        </button>
      </div>

      {/* ── Mobile Overlay (transparent, closes dropdown on outside click) ── */}
      {mobileOpen && <div className={styles.overlay} onClick={closeMobile} />}

      {/* ── Mobile Dropdown ── */}
      <div className={`${styles.mobileDropdown} ${mobileOpen ? styles.dropdownOpen : ''}`}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} item={item} showLabel onClick={closeMobile} />
        ))}
        {isAdmin && (
          <>
            <div className={styles.divider} />
            {ADMIN_NAV_ITEMS.map(item => (
              <NavLink key={item.to} item={item} showLabel onClick={closeMobile} />
            ))}
          </>
        )}
        <div className={styles.divider} />
        <button
          className={styles.footerBtn}
          onClick={() => {
            handleAuthAction();
            closeMobile();
          }}
        >
          <i className={`pi ${isAuthenticated ? 'pi-sign-out' : 'pi-sign-in'}`} />
          <span>{isAuthenticated ? 'Sign out' : 'Sign in'}</span>
        </button>
        {isAuthenticated && (
          <div className={styles.userInfo}>
            <span className={styles.username}>{username}</span>
            {isAdmin && <span className={styles.adminBadge}>admin</span>}
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
