import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggle.module.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={styles.toggle}>
      <i className={`pi pi-sun ${styles.icon} ${!isDark ? styles.iconActive : ''}`} aria-hidden='true' />
      <button
        className={`${styles.pill} ${isDark ? styles.pillDark : ''}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <span className={styles.thumb} />
      </button>
      <i className={`pi pi-moon ${styles.icon} ${isDark ? styles.iconActive : ''}`} aria-hidden='true' />
    </div>
  );
};

export default ThemeToggle;
