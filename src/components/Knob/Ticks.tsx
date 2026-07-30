import styles from './Ticks.module.css';

interface TicksProps {
  ticks?: number;
  angle?: number;
}

const getTickAngle = (ticks: number, tickNum: number) => -135 + (280 / ticks) * tickNum;

const Ticks = ({ ticks = 28, angle = 0 }: TicksProps) => (
  <>
    {Array.from(Array(ticks).keys()).map(tickNum => {
      const tickAngle = getTickAngle(ticks, tickNum);
      return (
        <div
          key={tickNum}
          className={`${styles.tick} ${tickAngle <= angle - 135 ? styles.tickActive : ''}`}
          style={{ transform: `rotate(${tickAngle}deg)` }}
        />
      );
    })}
  </>
);

export default Ticks;
