import { LoremIpsum } from 'lorem-ipsum';
import facePalmImage from '@/assets/facepalm.jpg';
import styles from './Home.module.css';

const lorem = new LoremIpsum();

const SECTIONS = [
  { heading: 'On Building Things', paragraphs: [lorem.generateParagraphs(2), lorem.generateParagraphs(2)] },
  { heading: 'On Photographing Stuff', paragraphs: [lorem.generateParagraphs(2), lorem.generateParagraphs(1)] },
  { heading: 'On Coping with Reality', paragraphs: [lorem.generateParagraphs(1), lorem.generateParagraphs(2)] },
];

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
    <div className={styles.prose}>
      {SECTIONS.map(({ heading, paragraphs }) => (
        <section key={heading} className={styles.proseSection}>
          <h2 className={styles.proseHeading}>{heading}</h2>
          {paragraphs.map((p, i) => (
            <p key={i} className={styles.proseParagraph}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  </div>
);

export default Home;
