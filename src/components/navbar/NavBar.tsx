import facePalmImage from '@/assets/facepalm.jpg';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@tanstack/react-router';
import styles from './NavBar.module.css';

const NavBar = () => {
  const { isAuthenticated, isAdmin, username, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={styles.stickyNavbar}>
      <nav className={styles.navbarContainer}>
        <Link
          to='/'
          className={styles.navbarLogoLink}>
          <div className={styles.navbarLogo}>
            <img
              src={facePalmImage}
              alt='face palm portrait'
              className={styles.facePalmImage}
            />
            <div>
              <p>Thomas Baldwin Barry</p>
            </div>
          </div>
        </Link>
        <div className={styles.navLinks}>
          <Link
            to='/'
            activeProps={{ className: styles.activeLink }}
          />
        </div>
        <div className={styles.navLinks}>
          <Link
            to='/'
            activeProps={{ className: styles.activeLink }}
            className={styles.navLink}>
            Home
          </Link>
          <Link
            to='/galleries'
            activeProps={{ className: styles.activeLink }}
            className={styles.navLink}>
            Galleries
          </Link>
        </div>

        <div className={styles.authSection}>
          {isLoading ? (
            <div className={styles.authLoading}>Loading...</div>
          ) : isAuthenticated ? (
            <div className={styles.userInfo}>
              <span className={styles.username}>
                {username} {isAdmin && <span className={styles.adminBadge}>Admin</span>}
              </span>
              <button
                onClick={handleLogout}
                className={styles.logoutButton}>
                Logout
              </button>
            </div>
          ) : (
            <Link
              to='/login'
              className={styles.loginButton}>
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
