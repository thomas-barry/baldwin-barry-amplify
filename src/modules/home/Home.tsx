import facePalmImage from '@/assets/facepalm.jpg';
import styles from './Home.module.css';

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <img
        src={facePalmImage}
        alt='Facepalm'
        className={styles.facePalmImage}
      />
    </div>
  );
};

export default Home;
