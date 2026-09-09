import { Icon } from '@/components/Icon';
import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggle.module.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={styles.toggle}>
      <Icon
        name='sun'
        className={`${styles.icon} ${!isDark ? styles.iconActive : ''}`}
      />
      <button
        className={`${styles.pill} ${isDark ? styles.pillDark : ''}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
        <span className={styles.thumb} />
      </button>
      <Icon
        name='moon'
        className={`${styles.icon} ${isDark ? styles.iconActive : ''}`}
      />
    </div>
  );
};

export default ThemeToggle;
