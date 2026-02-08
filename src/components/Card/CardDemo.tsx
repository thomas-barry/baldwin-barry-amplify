import clsx from 'clsx';
import React from 'react';
import { Card } from '../Card';
import styles from './CardDemo.module.css';

export const CardDemo: React.FC = () => {
  const handleCardClick = (cardType: string) => {
    console.log(`${cardType} card clicked!`);
  };

  return (
    <div className={styles.demoContainer}>
      <div className={styles.anchorTarget}>Anchor Target</div>
      <h2 className={styles.gradientHeading}>Card Component Demo</h2>
      <div className={styles.cardGrid}>
        <Card
          variant='default'
          padding='md'>
          <h3>Default Card</h3>
          <p>This is a basic card with default styling and medium padding.</p>
          <div className={styles.colorBlock}>
            <span>Color Block</span>
          </div>
          <div className={clsx(styles.colorBlock, styles.colorBlockAlt)}>
            <span>Alt Color Block</span>
          </div>
          <div className={clsx(styles.colorBlock, styles.anchorBlock)}>
            <span>Anchor Block</span>
          </div>
        </Card>

        <Card
          variant='elevated'
          padding='lg'
          clickable
          onClick={() => handleCardClick('Elevated')}>
          <h3>Elevated Clickable Card</h3>
          <p>This card has elevation and responds to hover/click interactions.</p>
          <p>This card has elevation and responds to hover/click interactions.</p>
          <p>This card has elevation and responds to hover/click interactions.</p>
          <p>This card has elevation and responds to hover/click interactions.</p>
          <p>This card has elevation and responds to hover/click interactions.</p>
          <p>This card has elevation and responds to hover/click interactions.</p>
          <small>Click me!</small>
        </Card>

        <Card
          variant='outlined'
          padding='sm'>
          <h3>Outlined Card</h3>
          <p>This card uses an outlined style with small padding.</p>
        </Card>

        <Card
          variant='default'
          clickable
          className={styles.fullWidth}
          onClick={() => handleCardClick('Interactive')}>
          <div className={styles.cardContent}>
            <div className={styles.cardIcon}>🎨</div>
            <h3>Interactive Card</h3>
            <p>Hover over me to see the smooth animation effects!</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CardDemo;
