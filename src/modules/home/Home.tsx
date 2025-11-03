import facePalmImage from '@/assets/facepalm.jpg';
import resist from '@/assets/resist.png';
import { useRouter } from '@tanstack/react-router';
import styles from './Home.module.css';

const Home = () => {
  const router = useRouter();

  const onLogoClick = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      router.navigate({ to: '/login' });
    }
  };

  return (
    <div className={styles.homeContainer}>
      <img
        src={facePalmImage}
        alt='Facepalm'
        className={styles.facePalmImage}
        onClick={onLogoClick}
      />
      <img
        className={styles.facePalmCaption}
        src={resist}
        alt='Resist'
      />
    </div>
  );
};

export default Home;
