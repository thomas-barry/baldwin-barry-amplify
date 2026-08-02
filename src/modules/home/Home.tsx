import facePalmImage from '@/assets/facepalm.jpg';
import { CurtainCard } from '@/components/CurtainCard';
import styles from './Home.module.css';

const Home = () => (
  <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.overline}>Retired Gen-X Software Engineer · Borderline Misanthrope</p>
        <h1 className={styles.headline}>
          Building things.
          <br />
          Photographing stuff.
          <br />
          Coping with reality.
        </h1>
        <p className={styles.body}>
          This is my sandbox for playing with web technologies. Mostly built with Claude Code.
        </p>
      </div>
      <div className={styles.heroPhoto}>
        <CurtainCard
          className={styles.heroCard}
          height='auto'
          variant='default'
          padding='none'
          enterDelay='0.25s'
          front={
            <img
              src={facePalmImage}
              alt='Thomas Baldwin Barry'
              className={styles.heroCardImage}
            />
          }
          back={<div className={styles.heroCardBack}>Fuck Donald Trump</div>}
        />
      </div>
    </section>
  </div>
);

export default Home;
