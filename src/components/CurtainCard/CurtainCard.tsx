import React from 'react';
import styles from './CurtainCard.module.css';

interface CurtainCardProps {
  /** Content displayed on the front face (resting state) */
  front: React.ReactNode;
  /** Content revealed on the back face when hovered */
  back: React.ReactNode;
  /**
   * CSS height value for the card. Both panels fill this height.
   * Defaults to '240px'. Use any valid CSS length: '300px', '20rem', etc.
   */
  height?: string;
  /** Visual style variant */
  variant?: 'default' | 'elevated' | 'outlined';
  /** Inner padding size applied to both panels */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Delay before the mouse-enter animation starts. Does not affect the leave animation.
   * Any valid CSS time value: '0.5s', '300ms', etc.
   */
  enterDelay?: string;
  /** Additional class name applied to the container */
  className?: string;
  /** Additional class name applied to the front panel */
  frontClassName?: string;
  /** Additional class name applied to the back panel */
  backClassName?: string;
  /** Inline styles applied to the front panel */
  frontStyle?: React.CSSProperties;
  /** Inline styles applied to the back panel */
  backStyle?: React.CSSProperties;
}

export const CurtainCard: React.FC<CurtainCardProps> = ({
  front,
  back,
  height = '240px',
  variant = 'default',
  padding = 'md',
  enterDelay = '0s',
  className = '',
  frontClassName = '',
  backClassName = '',
  frontStyle,
  backStyle,
}) => {
  const containerClasses = [
    styles.curtainCard,
    styles[variant],
    styles[`padding-${padding}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={containerClasses}
      style={{
        '--curtain-height': height,
        '--curtain-enter-delay': enterDelay,
      } as React.CSSProperties}>
      <div className={[styles.back, backClassName].filter(Boolean).join(' ')} style={backStyle}>{back}</div>
      <div className={[styles.front, frontClassName].filter(Boolean).join(' ')} style={frontStyle}>{front}</div>
    </article>
  );
};

export default CurtainCard;
