import AuthButton from '@/components/AuthButton';
import type { IconName } from '@/components/Icon';
import { Icon } from '@/components/Icon';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { complaintsByStatusQueryOptions } from '@/modules/complaints';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  icon: IconName;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: 'home', label: 'Home', exact: true },
  { to: '/photos', icon: 'images', label: 'Photography' },
  { to: '/blog', icon: 'book', label: 'Musings' },
  { to: '/complaints', icon: 'megaphone', label: 'Complaints' },
  { to: '/sandbox', icon: 'th-large', label: 'Sandbox' },
  { to: '/about', icon: 'user', label: 'About' },
];

const MOBILE_BREAKPOINT = 768;

const COMPLAINT_QUEUE_PATH = '/admin/complaints';

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin', icon: 'cog', label: 'Admin' },
  { to: '/admin/quips', icon: 'comment', label: 'Quips' },
  { to: COMPLAINT_QUEUE_PATH, icon: 'megaphone', label: 'Complaint Queue' },
  // Was a loose constant rendered only in the mobile dropdown, so it never
  // appeared in the desktop sidebar at all.
  { to: '/admin/upload', icon: 'images', label: 'Upload Photos' },
  { to: '/admin/logs', icon: 'list', label: 'Upload Logs' },
];

interface NavLinkProps {
  item: NavItem;
  showLabel: boolean;
  onClick?: () => void;
  /** A count to flag on the item; nothing renders for zero or undefined. */
  badge?: number;
}

const NavLink = ({ item, showLabel, onClick, badge }: NavLinkProps) => (
  <Link
    to={item.to}
    className={styles.navItem}
    activeProps={{ className: styles.active }}
    activeOptions={{ exact: item.exact }}
    onClick={onClick}>
    <Icon
      name={item.icon}
      className={styles.navIcon}
    />
    {showLabel && <span className={styles.navLabel}>{item.label}</span>}
    {!!badge && (
      <span
        className={styles.navBadge}
        aria-label={`${badge} awaiting approval`}>
        {badge}
      </span>
    )}
  </Link>
);

const MOBILE_NAV_ID = 'mobile-nav';

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useAuth();
  // Shares its cache with the admin complaints page, so approving there
  // updates the badge without a second request.
  const { data: pendingComplaints } = useQuery({ ...complaintsByStatusQueryOptions('PENDING'), enabled: isAdmin });
  const badgeFor = (item: NavItem) => (item.to === COMPLAINT_QUEUE_PATH ? pendingComplaints?.length : undefined);

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

  // Derived from mobileOpen, never toggled alongside setMobileOpen: the resize
  // handler above force-closes the menu at >=768px, and an imperative toggle
  // would leave the document locked with nothing left to unlock it.
  useEffect(() => {
    if (!mobileOpen) return;
    // Captured before the lock lands, because taking body out of flow collapses
    // the document's scroll height and the browser discards the offset.
    const { scrollY } = window;
    document.body.style.top = `${-scrollY}px`;
    document.body.classList.add('nav-open');
    return () => {
      document.body.classList.remove('nav-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

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
                  badge={badgeFor(item)}
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
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className={styles.mobileTopBar}>
        <button
          className={`${styles.mobileIconBtn} ${mobileOpen ? styles.mobileIconBtnActive : ''}`}
          onClick={() => setMobileOpen(o => !o)}
          aria-expanded={mobileOpen}
          aria-controls={MOBILE_NAV_ID}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}>
          <Icon name='bars' />
        </button>
        <Link
          to='/'
          className={styles.mobileLogoLink}
          onClick={closeMobile}>
          <span className={styles.mobileTitle}>THOMAS BALDWIN BARRY</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={closeMobile}
        />
      )}

      {/* ── Mobile Dropdown ── */}
      <div
        id={MOBILE_NAV_ID}
        className={`${styles.mobileDropdown} ${mobileOpen ? styles.dropdownOpen : ''}`}>
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
                badge={badgeFor(item)}
              />
            ))}
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
