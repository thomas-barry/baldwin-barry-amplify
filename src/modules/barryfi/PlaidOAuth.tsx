import { useEffect } from 'react';
import styles from './PlaidOAuth.module.css';

/* Landing page for Plaid's OAuth handoff. Plaid re-initialises Link in the
   original tab, so there is nothing to do here but tell the user they're done. */
const PlaidOAuth = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'BarryFi';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>BarryFi</h1>
      <p className={styles.body}>You can close this window and return to BarryFi.</p>
    </div>
  );
};

export default PlaidOAuth;
