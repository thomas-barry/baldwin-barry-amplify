import React from 'react';
import styles from './CurtainCard.module.css';

interface CurtainCardProps {
  /** Content displayed on the front face (resting state) */
  front: React.ReactNode;
  /** Content revealed on the back face when hovered */
  back: React.ReactNode;
  /**
   * Controlled open state. When true the curtain is held open regardless of hover,
   * which lets a consumer drive the reveal from tap, focus or keyboard. Leave it
   * undefined for the default hover-only, JavaScript-free behaviour.
   */
  open?: boolean;
  /**
   * Fired once the curtain has finished sliding back to its closed position.
   * Interrupted closes never fire it, so this is the safe moment to swap the
   * back content: the front panel is guaranteed to be covering it.
   */
  onCloseComplete?: () => void;
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
  open,
  onCloseComplete,
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
  /*
   * The same `transform` transition runs in both directions, so the resting
   * position is what distinguishes a finished close from a finished open.
   */
  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform' || !onCloseComplete) return;
    const transform = getComputedStyle(event.currentTarget).transform;
    if (transform === 'none' || new DOMMatrix(transform).m42 === 0) {
      onCloseComplete();
    }
  };

  const containerClasses = [styles.curtainCard, styles[variant], styles[`padding-${padding}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={containerClasses}
      data-open={open ? 'true' : undefined}
      style={
        {
          '--curtain-height': height,
          '--curtain-enter-delay': enterDelay,
        } as React.CSSProperties
      }>
      <div
        className={[styles.back, backClassName].filter(Boolean).join(' ')}
        style={backStyle}>
        {back}
      </div>
      <div
        className={[styles.front, frontClassName].filter(Boolean).join(' ')}
        style={frontStyle}
        onTransitionEnd={handleTransitionEnd}>
        {front}
      </div>
    </article>
  );
};

export default CurtainCard;
