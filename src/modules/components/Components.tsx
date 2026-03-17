import { useState } from 'react';
import DiceCube from '@/components/DiceCube';
import ImageSquareSelector from '@/components/ImageSquareSelector';
import type { SquareSelection } from '@/components/ImageSquareSelector';
import styles from './Components.module.css';

const DEMO_IMAGE = 'https://picsum.photos/seed/demo/1200/800';

const Components = () => {
  const [selection, setSelection] = useState<SquareSelection | null>(null);
  const [face, setFace] = useState<number | null>(null);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Components</h1>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The die is cast</h2>
        <div className={styles.demo}>
          <DiceCube onFaceChange={setFace} />
          {face !== null && (
            <p className={styles.dieReadout}>
              {'⚀⚁⚂⚃⚄⚅'[face - 1]}&ensp;{['one', 'two', 'three', 'four', 'five', 'six'][face - 1]}
            </p>
          )}
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

export default Components;
