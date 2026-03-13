import styles from './About.module.css';

const About = () => (
  <div className={styles.page}>
    <h1 className={styles.heading}>About</h1>
    <p className={styles.body}>
      Retired senior software engineer. Amateur photographer. This site is a sandbox for exploring
      web technologies — built mostly with AWS Amplify and Claude Code.
    </p>
  </div>
);

export default About;
