import AuthButton from '@/components/AuthButton';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
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
  { to: '/photos', icon: 'pi pi-images', label: 'Photography' },
  { to: '/blog', icon: 'pi pi-book', label: 'Musings' },
  { to: '/sandbox', icon: 'pi pi-th-large', label: 'Sandbox' },
  { to: '/about', icon: 'pi pi-user', label: 'About' },
  { to: '/contact', icon: 'pi pi-envelope', label: 'Contact' },
];

const MOBILE_BREAKPOINT = 768;

const ADMIN_NAV_ITEMS: NavItem[] = [{ to: '/admin', icon: 'pi pi-cog', label: 'Admin' }];

const ADMIN_CAMERA_NAV_ITEM: NavItem = { to: '/admin/camera', icon: 'pi pi-camera', label: 'Camera Upload' };

const NavLink = ({ item, showLabel, onClick }: { item: NavItem; showLabel: boolean; onClick?: () => void }) => (
  <Link
    to={item.to}
    className={styles.navItem}
    activeProps={{ className: styles.active }}
    activeOptions={{ exact: item.exact }}
    onClick={onClick}>
    <i className={`${item.icon} ${styles.navIcon}`} />
    {showLabel && <span className={styles.navLabel}>{item.label}</span>}
  </Link>
);

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useAuth();

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

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              item={item}
              showLabel={!collapsed}
            />
          ))}
          {isAdmin && (
            <>
              <div className={styles.divider} />
              {!collapsed && <span className={styles.navSection}>Admin</span>}
              {ADMIN_NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  item={item}
                  showLabel={!collapsed}
                />
              ))}
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <i className={`pi ${collapsed ? 'pi-chevron-right' : 'pi-chevron-left'}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className={styles.mobileTopBar}>
        <Link
          to='/'
          className={styles.mobileLogoLink}
          onClick={closeMobile}>
          <span className={styles.mobileTitle}>THOMAS BALDWIN BARRY</span>
        </Link>
        <ThemeToggle />
        <button
          className={`${styles.mobileIconBtn} ${mobileOpen ? styles.mobileIconBtnActive : ''}`}
          onClick={() => setMobileOpen(o => !o)}
          aria-expanded={mobileOpen}
          aria-label='Open navigation menu'>
          <i className='pi pi-bars' />
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={closeMobile}
        />
      )}

      {/* ── Mobile Dropdown ── */}
      <div className={`${styles.mobileDropdown} ${mobileOpen ? styles.dropdownOpen : ''}`}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            item={item}
            showLabel
            onClick={closeMobile}
          />
        ))}
        {isAdmin && (
          <>
            <div className={styles.divider} />
            {ADMIN_NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                item={item}
                showLabel
                onClick={closeMobile}
              />
            ))}
            <NavLink
              item={ADMIN_CAMERA_NAV_ITEM}
              showLabel
              onClick={closeMobile}
            />
          </>
        )}
        <div className={styles.divider} />
        <div className={styles.mobileAuthRow}>
          <AuthButton />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
