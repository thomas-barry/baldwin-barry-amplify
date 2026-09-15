import styles from './Ticks.module.css';

interface TicksProps {
  ticks?: number;
  angle?: number;
}

/** The dial sweeps 270°, from -135° to +135°. Ticks span that whole arc, so the
 *  first sits under the minimum and the last under the maximum. This was
 *  `280 / ticks`, which only lands the last tick on +135° when ticks is 28 (the
 *  default); at 11 it stopped near +119° and the arc looked lopsided. */
const SWEEP = 270;
const START = -135;

const getTickAngle = (ticks: number, tickNum: number) => (ticks > 1 ? START + (SWEEP / (ticks - 1)) * tickNum : START);

// Tick and knob angles come from different divisions (e.g. 0.3 * 270 is
// 81.00000000000001), so an exact comparison can leave a tick unlit at the
// very value it marks.
const ANGLE_EPSILON = 0.001;

const Ticks = ({ ticks = 28, angle = 0 }: TicksProps) => (
  <>
    {Array.from(Array(ticks).keys()).map(tickNum => {
      const tickAngle = getTickAngle(ticks, tickNum);
      return (
        <div
          key={tickNum}
          className={`${styles.tick} ${tickAngle <= angle + START + ANGLE_EPSILON ? styles.tickActive : ''}`}
          style={{ transform: `rotate(${tickAngle}deg)` }}
        />
      );
    })}
  </>
);

export default Ticks;
