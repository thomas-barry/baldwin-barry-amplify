import facePalmImage from '@/assets/facepalm.jpg';
import styles from './Home.module.css';

const Home = () => (
  <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.overline}>Retired Software Engineer · Amateur Photographer · Borderline Misanthrope</p>
        <h1 className={styles.headline}>
          Building things.
          <br />
          Photographing stuff.
          <br />
          Coping with reality.
        </h1>
        <p className={styles.body}>
          A sandbox for exploring web technologies, with a side of photography. This site is as much about the making as
          it is about the showing.
        </p>
      </div>
      <div className={styles.heroPhoto}>
        <img
          src={facePalmImage}
          alt='Thomas Baldwin Barry'
          className={styles.heroImage}
        />
      </div>
    </section>
  </div>
);

export default Home;
