import ellipse from '@/assets/Ellipse.svg';
import facePalmImage from '@/assets/facepalm.jpg';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import ReactKnob from './components/react-knob/ReactKnob';
import styles from './Home.module.css';

const BADGES: { label: string; href: string }[] = [
  { label: 'AWS Amplify', href: 'https://aws.amazon.com/amplify/' },
  { label: 'TypeScript', href: 'https://www.typescriptlang.org/' },
  { label: 'React', href: 'https://react.dev/' },
  { label: 'React Query', href: 'https://tanstack.com/query/latest' },
];

const Home = () => {
  const [knobValue, setKnobValue] = useState(120);

  return (
    <div className={styles.page}>
      <img
        src={ellipse}
        alt=''
        aria-hidden='true'
        className={styles.ellipse}
      />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroNameRow}>
            <h1 className={styles.heroName}>
              Thomas
              <br />
              <span className={styles.heroNameAccent}>Baldwin</span>
              <br />
              Barry
            </h1>
            <div className={styles.heroImageFrame}>
              <img
                src={facePalmImage}
                alt='Thomas Baldwin Barry'
                className={styles.heroImage}
              />
              <div
                className={styles.heroImageGlow}
                aria-hidden='true'
              />
            </div>
          </div>

          <p className={styles.heroBio}>
            Retired senior software engineer. This is my sandbox. Built mostly with Claude Code.
          </p>
          <div className={styles.badges}>
            {BADGES.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className={styles.badge}
                target='_blank'
                rel='noopener noreferrer'
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div
          className={styles.scrollCue}
          aria-hidden='true'>
          <span>scroll</span>
          <i className='pi pi-chevron-down' />
        </div>
      </section>

      {/* ── Tech Demos ── */}
      <section className={styles.demos}>
        <div className={styles.demosHeader}>
          <h2 className={styles.demosHeading}>
            <span className={styles.demosComment}>// </span>tech_demos
          </h2>
          <p className={styles.demosSubhead}>Sandbox modules — each a working exploration of a technology.</p>
        </div>

        <div className={styles.grid}>
          {/* Galleries */}
          <Link
            to='/photos'
            className={styles.card}>
            <div className={styles.cardInner}>
              <div className={styles.cardMeta}>
                <span className={styles.cardNum}>01</span>
                <span className={`${styles.cardStatus} ${styles.statusLive}`}>LIVE</span>
              </div>
              <i className={`pi pi-images ${styles.cardIcon}`} />
              <h3 className={styles.cardTitle}>Photos</h3>
              <p className={styles.cardDesc}>Photo gallery management with AWS S3 and DynamoDB backend.</p>
              <span className={styles.cardAction}>open_module →</span>
            </div>
          </Link>

          {/* Grid Demo */}
          <Link
            to='/grid-demo'
            className={styles.card}>
            <div className={styles.cardInner}>
              <div className={styles.cardMeta}>
                <span className={styles.cardNum}>02</span>
                <span className={`${styles.cardStatus} ${styles.statusLive}`}>LIVE</span>
              </div>
              <i className={`pi pi-table ${styles.cardIcon}`} />
              <h3 className={styles.cardTitle}>Grid Demo</h3>
              <p className={styles.cardDesc}>Interactive data grid powered by TanStack Query and virtual rendering.</p>
              <span className={styles.cardAction}>open_module →</span>
            </div>
          </Link>

          {/* Signal Knob — live demo card */}
          <div className={`${styles.card} ${styles.cardNoLink}`}>
            <div className={styles.cardInner}>
              <div className={styles.cardMeta}>
                <span className={styles.cardNum}>03</span>
                <span className={`${styles.cardStatus} ${styles.statusDemo}`}>DEMO</span>
              </div>
              <h3 className={styles.cardTitle}>Signal Knob</h3>
              <p className={styles.cardDesc}>Custom knob control. Canvas + pointer events.</p>
              <div className={styles.knobWrapper}>
                <ReactKnob
                  value={knobValue}
                  onChange={setKnobValue}
                  minValue={0}
                  maxValue={255}
                  label={`Signal ${Math.round(knobValue)}`}
                  aria-label='Signal strength'
                />
              </div>
            </div>
          </div>

          {/* Coming Soon — WebGL */}
          <div className={`${styles.card} ${styles.cardLocked}`}>
            <div className={styles.cardInner}>
              <div className={styles.cardMeta}>
                <span className={styles.cardNum}>04</span>
                <span className={`${styles.cardStatus} ${styles.statusSoon}`}>SOON</span>
              </div>
              <i className={`pi pi-globe ${styles.cardIcon} ${styles.cardIconMuted}`} />
              <h3 className={`${styles.cardTitle} ${styles.cardTitleMuted}`}>WebGL Canvas</h3>
              <p className={`${styles.cardDesc} ${styles.cardDescMuted}`}>Three.js + WebGL shader experiments.</p>
            </div>
          </div>

          {/* Coming Soon — WebSockets */}
          <div className={`${styles.card} ${styles.cardLocked}`}>
            <div className={styles.cardInner}>
              <div className={styles.cardMeta}>
                <span className={styles.cardNum}>05</span>
                <span className={`${styles.cardStatus} ${styles.statusSoon}`}>SOON</span>
              </div>
              <i className={`pi pi-wifi ${styles.cardIcon} ${styles.cardIconMuted}`} />
              <h3 className={`${styles.cardTitle} ${styles.cardTitleMuted}`}>WebSockets</h3>
              <p className={`${styles.cardDesc} ${styles.cardDescMuted}`}>Real-time data stream visualization.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
