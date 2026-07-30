import facePalmImage from '@/assets/facepalm.jpg';
import { Link } from '@tanstack/react-router';
import styles from './PageHeader.module.css';

const PageHeader = () => (
  <div className={styles.pageHeader}>
    <Link
      to='/'
      className={styles.identity}>
      <img
        src={facePalmImage}
        alt='Thomas Baldwin Barry'
        className={styles.logo}
      />
      <span className={styles.name}>Thomas Baldwin Barry</span>
    </Link>
  </div>
);

export default PageHeader;
