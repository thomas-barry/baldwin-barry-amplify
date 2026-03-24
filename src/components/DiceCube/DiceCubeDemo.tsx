import { lazy, Suspense, useRef, useState } from 'react';
import styles from './DiceCubeDemo.module.css';

const DiceCube = lazy(() => import('./DiceCube'));

const SUM_WORDS: Record<number, string> = {
  2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven',
  8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
};

const DiceCubeDemo = () => {
  const [face1, setFace1] = useState<number | null>(null);
  const [face2, setFace2] = useState<number | null>(null);
  const [rollingCount, setRollingCount] = useState(0);
  const rollRef1 = useRef<(() => void) | null>(null);
  const rollRef2 = useRef<(() => void) | null>(null);
  const isRolling = rollingCount > 0;

  const handleRoll = () => {
    rollRef1.current?.();
    rollRef2.current?.();
    setRollingCount(2);
  };

  const handleRollEnd = () => setRollingCount(c => Math.max(0, c - 1));

  const sum = face1 !== null && face2 !== null ? face1 + face2 : null;

  return (
    <div className={styles.container}>
      <Suspense
        fallback={
          <div className={styles.diceRow}>
            <div className={styles.loading} />
            <div className={styles.loading} />
          </div>
        }
      >
        <div className={styles.diceRow}>
          <DiceCube onFaceChange={setFace1} onRollEnd={handleRollEnd} rollRef={rollRef1} />
          <DiceCube onFaceChange={setFace2} onRollEnd={handleRollEnd} rollRef={rollRef2} />
        </div>
      </Suspense>
      <div className={styles.controls}>
        <button className={styles.rollBtn} disabled={isRolling} onClick={handleRoll}>
          Roll
        </button>
        <div className={styles.result}>
          {isRolling ? (
            <div className={styles.spinnerRing} />
          ) : (
            sum !== null && (
              <p className={styles.readout}>{SUM_WORDS[sum] ?? sum}</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default DiceCubeDemo;
