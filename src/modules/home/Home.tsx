import ellipse from '@/assets/Ellipse.svg';
import facePalmImage from '@/assets/facepalm.jpg';
import resist from '@/assets/resist.png';
import styles from './Home.module.css';

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <img
        src={ellipse}
        alt=""
        aria-hidden="true"
        className={styles.ellipseImage}
        width={1000}
        height={1000}
      />
      <img
        src={facePalmImage}
        alt='Facepalm'
        className={styles.facePalmImage}
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
