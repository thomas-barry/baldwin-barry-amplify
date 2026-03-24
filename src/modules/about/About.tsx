import styles from './About.module.css';

const About = () => (
  <div className={styles.page}>
    <h1 className={styles.heading}>About</h1>
    <p className={styles.body}>I've spent the better part of three decades solving hard problems with software.</p>
    <p className={styles.body}>
      I started out as an Oracle consultant, went on to run my own firm for over a decade alongside a good friend and
      business partner, then spent 15 years at Wells Fargo leading the development of UI frameworks that serve as the
      foundation for their online banking applications. Most recently, I spent two years as a senior developer at Amazon
      writing applications for a new generation of FireTV devices.
    </p>
    <p className={styles.body}>
      Along the way I've worn a lot of hats: architect, team lead, mentor, and occasionally the person who figures out
      why the build is broken. It was never, ever my fault, not even once (cough).
    </p>
    <p className={styles.body}>
      For the last few years or so work felt unrewarding and I was burned out. So, I decided to retire early.
    </p>
    <p className={styles.body}>
      Now that I have the time, I'm leaning into the things I enjoy — baking bread, photography, cycling, exploring new
      rabbit holes, and figuring out what's next.
    </p>
  </div>
);

export default About;
