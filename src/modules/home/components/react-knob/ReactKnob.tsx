import clsx from 'clsx';
import { KeyboardEvent, TouchEvent, useEffect, useRef } from 'react';
import styles from './ReactKnob.module.css';
import Ticks from './Ticks';

interface ReactKnobProps {
  value?: number;
  onChange?: (nextValue: number) => void;
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
  ticks?: number;
  keyStepPct?: number;
  className?: string;
  label?: string;
  minMaxLabels?: boolean;
  'aria-label'?: string;
}

const ReactKnob = ({
  value = 0,
  onChange,
  minValue = 0,
  maxValue = 255,
  minLabel = 'Min',
  maxLabel = 'Max',
  ticks = 28,
  keyStepPct = 10,
  className,
  label,
  minMaxLabels = true,
  ...props
}: ReactKnobProps) => {
  const valueRef = useRef(value);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const lastTouchMoveY = useRef<number>();

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) {
      return;
    }

    const onWheel = (e: WheelEvent) => {
      onChange?.(Math.min(Math.max(valueRef.current + e.deltaY, minValue), maxValue));
      e.preventDefault();
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
    };
  }, [maxValue, minValue, onChange]);

  const onKeyDown = ({ key, shiftKey }: KeyboardEvent<HTMLDivElement>) => {
    if (key === 'ArrowUp') {
      onChange?.(
        Math.min(value + Number(shiftKey) + (maxValue - minValue) / ((shiftKey ? 2 : 1) * keyStepPct), maxValue),
      );
    } else if (key === 'ArrowDown') {
      onChange?.(
        Math.max(value - Number(shiftKey) - (maxValue - minValue) / ((shiftKey ? 2 : 1) * keyStepPct), minValue),
      );
    }
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    lastTouchMoveY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const previousY = lastTouchMoveY.current;
    if (typeof previousY !== 'number') {
      return;
    }

    const delta = previousY - e.touches[0].clientY;
    onChange?.(Math.min(Math.max(value + delta * 3.5, minValue), maxValue));
    lastTouchMoveY.current = e.touches[0].clientY;
  };

  const angle = (value / maxValue) * 270;

  return (
    <div
      ref={wheelRef}
      role='slider'
      tabIndex={0}
      className={clsx(styles.knobContainer, className)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-valuenow={value}
      aria-label={props['aria-label'] || label}>
      <div className={styles.knobDial}>
        <div
          className={styles.knob}
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <div className={styles.knobFocusRing} />
        <Ticks
          ticks={ticks}
          angle={angle}
        />
      </div>
      {minMaxLabels && <span className={styles.min}>{minLabel}</span>}
      {minMaxLabels && <span className={styles.max}>{maxLabel}</span>}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};

export default ReactKnob;
