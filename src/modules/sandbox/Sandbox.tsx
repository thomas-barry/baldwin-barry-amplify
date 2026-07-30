import { CurtainCard } from '@/components/CurtainCard';
import { DiceCubeDemo } from '@/components/DiceCube';
import type { SquareSelection } from '@/components/ImageSquareSelector';
import ImageSquareSelector from '@/components/ImageSquareSelector';
import KnobDemo from '@/components/KnobDemo';
import TanStackFormDemo from '@/components/TanStackFormDemo';
import { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import styles from './Sandbox.module.css';

const DEMO_IMAGE = 'https://picsum.photos/seed/demo/1200/800';

const Sandbox = () => {
  const [selection, setSelection] = useState<SquareSelection | null>(null);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Sandbox</h1>

      <CollapsibleSection title='The die is cast'>
        <div className={styles.demo}>
          <DiceCubeDemo />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title='Crank my knob'>
        <div className={styles.demo}>
          <KnobDemo />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title='TanStack Form'>
        <div className={styles.demo}>
          <TanStackFormDemo />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title='Curtain call'>
        <p className={styles.description}>Hover each card to raise the curtain and reveal what's underneath.</p>
        <div className={styles.curtainRow}>
          <CurtainCard
            height='200px'
            variant='default'
            padding='md'
            backClassName={styles.curtainBack}
            front={
              <>
                <strong>Team member</strong>
                <p>Barry Baldwin</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-300)' }}>Hover to learn more</p>
              </>
            }
            back={
              <>
                <strong>About Barry</strong>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-300)' }}>
                  Full-stack engineer. Passionate about design systems, CSS architecture, and building things that feel
                  right.
                </p>
              </>
            }
          />
          <CurtainCard
            height='200px'
            variant='elevated'
            padding='md'
            backClassName={styles.curtainBack}
            front={
              <>
                <strong>Latest release</strong>
                <p style={{ fontSize: 'var(--fs-600)', fontWeight: 'var(--fw-black)', margin: '0.25rem 0' }}>v2.4.0</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-300)' }}>Hover for changelog</p>
              </>
            }
            back={
              <>
                <strong>What's new</strong>
                <ul
                  style={{
                    fontSize: 'var(--fs-300)',
                    color: 'var(--color-text-muted)',
                    paddingLeft: '1.25rem',
                    margin: '0.5rem 0 0',
                  }}>
                  <li>CurtainCard component</li>
                  <li>Reduced motion support</li>
                  <li>Dark mode refinements</li>
                </ul>
              </>
            }
          />
          <CurtainCard
            height='200px'
            variant='outlined'
            padding='md'
            backClassName={styles.curtainBack}
            front={
              <>
                <strong>Pro tip</strong>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-300)' }}>
                  Pure CSS — no JavaScript state involved in this animation.
                </p>
              </>
            }
            back={
              <>
                <strong>How it works</strong>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-300)' }}>
                  The front panel uses <code>translateY(-100%)</code> on <code>:hover</code>, clipped by{' '}
                  <code>overflow: hidden</code> on the container.
                </p>
              </>
            }
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title='Square this'>
        <p className={styles.description}>Drag to select a square region. Click anywhere to reset.</p>
        <div className={styles.demo}>
          <ImageSquareSelector
            imageUrl={DEMO_IMAGE}
            selection={selection}
            onSelectionChange={setSelection}
          />
          {selection && (
            <p className={styles.values}>
              x: {selection.x.toFixed(3)} · y: {selection.y.toFixed(3)} · size: {selection.size.toFixed(3)}
            </p>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default Sandbox;
