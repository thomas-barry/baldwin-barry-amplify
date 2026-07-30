import clsx from 'clsx';
import styles from './ReactKnob.module.css';

interface TicksProps {
  ticks?: number;
  angle?: number;
}

const getTickAngle = ({ ticks, tickNum }: { ticks: number; tickNum: number }) => -135 + (280 / ticks) * tickNum;

const Ticks = ({ ticks = 28, angle = 0 }: TicksProps) => {
  return Array.from({ length: ticks }, (_, tickNum) => {
    const tickAngle = getTickAngle({ ticks, tickNum });
    return (
      <div
        key={tickNum}
        className={clsx(styles.tick, tickAngle <= angle - 135 && styles.active)}
        style={{ transform: `rotate(${tickAngle}deg)` }}
      />
    );
  });
};

export default Ticks;
