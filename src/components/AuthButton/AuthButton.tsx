import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
import styles from './AuthButton.module.css';

const AuthButton = () => {
  const { isAuthenticated, isAdmin, username, logout } = useAuth();
  const { openLogin } = useLoginDialog();

  if (isAuthenticated) {
    return (
      <div className={styles.wrapper}>
        <span className={styles.username}>{username}</span>
        {isAdmin && <span className={styles.adminBadge}>admin</span>}
        <button className={styles.iconBtn} onClick={logout} aria-label='Sign out' title='Sign out'>
          <i className='pi pi-sign-out' />
        </button>
      </div>
    );
  }

  return (
    <button className={styles.iconBtn} onClick={openLogin} aria-label='Sign in' title='Sign in'>
      <i className='pi pi-sign-in' />
    </button>
  );
};

export default AuthButton;
