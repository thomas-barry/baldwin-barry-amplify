import { Icon } from '@/components/Icon';
import styles from './SortSelect.module.css';

export type SortValue = 'newest' | 'alpha';

interface SortSelectProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
}

const SortSelect = ({ value, onChange }: SortSelectProps) => (
  <div className={styles.wrapper}>
    <Icon
      name='sort-alt'
      className={styles.icon}
    />
    <select
      className={styles.select}
      value={value}
      onChange={e => onChange(e.target.value as SortValue)}
      aria-label='Sort galleries'>
      <option value='newest'>Newest first</option>
      <option value='alpha'>Alphabetical</option>
    </select>
  </div>
);

export default SortSelect;
