import facePalmImage from '@/assets/facepalm.jpg';
import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
import { Link } from '@tanstack/react-router';
import styles from './NavBar.module.css';

const NavBar = () => {
  const { openLogin } = useLoginDialog();
  const { isAuthenticated } = useAuth();

  const handleLogoShiftClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!event.shiftKey) {
      return;
    }

    if (isAuthenticated) {
      return;
    }

    openLogin();
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
              onClick={handleLogoShiftClick}
            />
            <div>
              <p>xxx Thomas Baldwin Barry</p>
            </div>
          </div>
        </Link>
        <div className={styles.navLinks}>
          <Link
            to='/photos'
            activeProps={{ className: styles.activeLink }}
            className={styles.navLink}>
            Photos
          </Link>
        </div>
        <div className={styles.navLinks}>
          <Link
            to='/grid-demo'
            activeProps={{ className: styles.activeLink }}
            className={styles.navLink}>
            Grid Demo
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
