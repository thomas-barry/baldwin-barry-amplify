import facePalmImage from '@/assets/facepalm.png';
import { Link } from '@tanstack/react-router';
import styles from './NavBar.module.css';

const NavBar = () => {
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
            to='/galleries'
            activeProps={{ className: styles.activeLink }}
            className={styles.navLink}>
            Galleries
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
