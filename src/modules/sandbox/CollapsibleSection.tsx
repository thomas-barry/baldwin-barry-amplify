import { useState } from 'react';
import styles from './CollapsibleSection.module.css';

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, children, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        <button
          className={styles.toggle}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}>
          <span className={`${styles.triangle}${open ? ` ${styles.open}` : ''}`} />
          {title}
        </button>
      </h2>
      <div className={`${styles.body}${open ? '' : ` ${styles.collapsed}`}`}>
        <div className={styles.inner}>{children}</div>
      </div>
    </section>
  );
};

export default CollapsibleSection;
