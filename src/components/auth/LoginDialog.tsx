import { useAuth } from '@/context/AuthContext';
import { useLoginDialog } from '@/context/LoginDialogContext';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useRef } from 'react';
import styles from './LoginDialog.module.css';

const LoginDialog = () => {
  const { isOpen, closeLogin } = useLoginDialog();
  const { isAuthenticated, username, checkUser } = useAuth();
  const { route } = useAuthenticator(context => [context.route]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (route === 'authenticated' && isOpen) {
      checkUser();
      closeLogin();
    }
  }, [route, isOpen, checkUser, closeLogin]);

  const handleClose = () => {
    closeLogin();
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby='login-dialog-title'>
      <div className={styles.dialogContent}>
        <div className={styles.header}>
          <h2 id='login-dialog-title'>Sign In</h2>
          <button
            type='button'
            className={styles.closeButton}
            onClick={handleClose}
            aria-label='Close login dialog'>
            ×
          </button>
        </div>

        {isAuthenticated ? (
          <div className={styles.statusBlock}>
            <p>You are already signed in.</p>
            {username ? <p className={styles.username}>Signed in as {username}</p> : null}
            <button
              type='button'
              className={styles.primaryButton}
              onClick={handleClose}>
              Close
            </button>
          </div>
        ) : (
          <div className={styles.authenticatorWrap}>
            <Authenticator />
          </div>
        )}
      </div>
    </dialog>
  );
};

export default LoginDialog;
