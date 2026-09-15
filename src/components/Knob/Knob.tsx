import { useEffect, useRef } from 'react';
import styles from './Knob.module.css';
import Ticks from './Ticks';

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
  /** What a screen reader announces for a value. Defaults to a percentage of
   *  the range, which is meaningless on a scale with its own words. */
  valueText?: (value: number) => string;
}

/** The range the wheel and drag factors below were tuned on (the default
 *  0–255). Pointer input is scaled by the real range against this, so a full
 *  sweep takes the same physical travel whatever the bounds: on a 0–10 knob an
 *  unscaled wheel notch moved 50 units and slammed to an end. */
const TUNED_RANGE = 255;
const WHEEL_UNITS_PER_DELTA = 0.5;
const DRAG_UNITS_PER_PIXEL = 1.75;

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
  valueText,
}: KnobProps) => {
  // The unrounded position. Parents commonly round what onChange reports (see
  // KnobDemo, ComplaintForm), so continuing each gesture from the rounded prop
  // would swallow any movement smaller than half a unit — slow trackpad and
  // touch input would never move the knob at all. Accumulating here fixes that;
  // it re-syncs from the prop only when the parent sets a genuinely different
  // value, such as a reset.
  const positionRef = useRef(value);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastTouchMoveY = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  const dragStartValue = useRef<number>(0);

  const scale = (maxValue - minValue) / TUNED_RANGE;

  useEffect(() => {
    if (Math.round(positionRef.current) !== Math.round(value)) positionRef.current = value;
  }, [value]);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const next = Math.min(
        Math.max(positionRef.current + e.deltaY * WHEEL_UNITS_PER_DELTA * scale, minValue),
        maxValue,
      );
      positionRef.current = next;
      onChange?.(next);
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // Previously []: the listener captured the first render's onChange and
    // bounds, so wheel input called a stale callback and clamped to stale
    // min/max. Re-attaching is a remove/add pair on one listener.
  }, [onChange, minValue, maxValue, scale]);

  const emit = (next: number) => {
    const clamped = Math.min(Math.max(next, minValue), maxValue);
    positionRef.current = clamped;
    onChange?.(clamped);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { key, shiftKey } = e;
    const step = shiftKey ? 1 : (maxValue - minValue) / keyStepPct;
    const largeStep = (maxValue - minValue) / 10;
    if (key === 'ArrowUp' || key === 'ArrowRight') {
      emit(value + step);
    } else if (key === 'ArrowDown' || key === 'ArrowLeft') {
      emit(value - step);
    } else if (key === 'PageUp') {
      emit(value + largeStep);
    } else if (key === 'PageDown') {
      emit(value - largeStep);
    } else if (key === 'Home') {
      emit(minValue);
    } else if (key === 'End') {
      emit(maxValue);
    } else {
      return;
    }
    e.preventDefault();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartValue.current = positionRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = dragStartY.current - ev.clientY;
      emit(dragStartValue.current + delta * DRAG_UNITS_PER_PIXEL * scale);
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
    emit(positionRef.current + delta * DRAG_UNITS_PER_PIXEL * scale);
    lastTouchMoveY.current = e.touches[0].clientY;
  };

  const angle = ((value - minValue) / (maxValue - minValue)) * 270;

  return (
    <div
      ref={wheelRef}
      role='slider'
      tabIndex={0}
      className={`${styles.container}${className ? ` ${className}` : ''}`}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-valuenow={value}
      aria-valuetext={
        valueText ? valueText(value) : `${Math.round(((value - minValue) / (maxValue - minValue)) * 100)}%`
      }
      aria-label={ariaLabel ?? label}>
      <div className={styles.dial}>
        <div
          className={styles.knob}
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <div className={styles.focusRing} />
        <Ticks
          ticks={ticks}
          angle={angle}
        />
        <span className={styles.valueDisplay}>{Math.round(value)}</span>
      </div>
      {minMaxLabels && <span className={styles.min}>{minLabel}</span>}
      {minMaxLabels && <span className={styles.max}>{maxLabel}</span>}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};

export default Knob;
