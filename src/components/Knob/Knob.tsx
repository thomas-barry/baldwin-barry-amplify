import { useEffect, useRef } from 'react';
import Ticks from './Ticks';
import styles from './Knob.module.css';

interface KnobProps {
  value?: number;
  onChange?: (value: number) => void;
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

const Knob = ({
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
  'aria-label': ariaLabel,
}: KnobProps) => {
  const valueRef = useRef(value);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastTouchMoveY = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  const dragStartValue = useRef<number>(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      onChange?.(Math.min(Math.max(valueRef.current + e.deltaY, minValue), maxValue));
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { key, shiftKey } = e;
    const step = shiftKey ? 1 : (maxValue - minValue) / keyStepPct;
    const largeStep = (maxValue - minValue) / 10;
    if (key === 'ArrowUp' || key === 'ArrowRight') {
      onChange?.(Math.min(value + step, maxValue));
    } else if (key === 'ArrowDown' || key === 'ArrowLeft') {
      onChange?.(Math.max(value - step, minValue));
    } else if (key === 'PageUp') {
      onChange?.(Math.min(value + largeStep, maxValue));
    } else if (key === 'PageDown') {
      onChange?.(Math.max(value - largeStep, minValue));
    } else if (key === 'Home') {
      onChange?.(minValue);
    } else if (key === 'End') {
      onChange?.(maxValue);
    } else {
      return;
    }
    e.preventDefault();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartValue.current = valueRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = dragStartY.current - ev.clientY;
      onChange?.(Math.min(Math.max(dragStartValue.current + delta * 3.5, minValue), maxValue));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    lastTouchMoveY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const delta = lastTouchMoveY.current - e.touches[0].clientY;
    onChange?.(Math.min(Math.max(value + delta * 3.5, minValue), maxValue));
    lastTouchMoveY.current = e.touches[0].clientY;
  };

  const angle = ((value - minValue) / (maxValue - minValue)) * 270;

  return (
    <div
      ref={wheelRef}
      role="slider"
      tabIndex={0}
      className={`${styles.container}${className ? ` ${className}` : ''}`}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-valuenow={value}
      aria-valuetext={`${Math.round(((value - minValue) / (maxValue - minValue)) * 100)}%`}
      aria-label={ariaLabel ?? label}
    >
      <div className={styles.dial}>
        <div className={styles.knob} style={{ transform: `rotate(${angle}deg)` }} />
        <div className={styles.focusRing} />
        <Ticks ticks={ticks} angle={angle} />
      </div>
      {minMaxLabels && <span className={styles.min}>{minLabel}</span>}
      {minMaxLabels && <span className={styles.max}>{maxLabel}</span>}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};

export default Knob;
