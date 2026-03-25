import { useState } from 'react';
import { DiceCubeDemo } from '@/components/DiceCube';
import KnobDemo from '@/components/KnobDemo';
import ImageSquareSelector from '@/components/ImageSquareSelector';
import type { SquareSelection } from '@/components/ImageSquareSelector';
import styles from './Sandbox.module.css';

const DEMO_IMAGE = 'https://picsum.photos/seed/demo/1200/800';

const Sandbox = () => {
  const [selection, setSelection] = useState<SquareSelection | null>(null);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Sandbox</h1>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The die is cast</h2>
        <div className={styles.demo}>
          <DiceCubeDemo />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Reading lamp</h2>
        <div className={styles.demo}>
          <KnobDemo />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ImageSquareSelector</h2>
        <p className={styles.description}>Drag to select a square region. Click anywhere to reset.</p>
        <div className={styles.demo}>
          <ImageSquareSelector
            imageUrl={DEMO_IMAGE}
            selection={selection}
            onSelectionChange={setSelection}
          />
          {selection && (
            <p className={styles.values}>
              x: {selection.x.toFixed(3)} · y: {selection.y.toFixed(3)} · size:{' '}
              {selection.size.toFixed(3)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Sandbox;
