import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface LoginDialogContextType {
  isOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

const LoginDialogContext = createContext<LoginDialogContextType | null>(null);

export const LoginDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(() => ({ isOpen, openLogin, closeLogin }), [isOpen, openLogin, closeLogin]);

  return <LoginDialogContext.Provider value={value}>{children}</LoginDialogContext.Provider>;
};

// Provider and hook intentionally share a file; the hook is not a component,
// so Fast Refresh is unaffected.
// eslint-disable-next-line react-refresh/only-export-components
export const useLoginDialog = () => {
  const context = useContext(LoginDialogContext);

  if (!context) {
    throw new Error('useLoginDialog must be used within a LoginDialogProvider');
  }

  return context;
};
